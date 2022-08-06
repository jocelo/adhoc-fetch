import URI from "urijs";

// /records endpoint
window.path = "http://localhost:3000/records";

const settings = {
  itemsPerPage: 10
};

// TODO: Add test coverage for helper functions created

/**
 * Helper function that returns if the argument is a primary color
 * A primary color is either 'red', 'blue' or 'yellow'.
 *
 * @param {*} _color - string - to check against list of primary colors
 * @returns boolean
 */
function isPrimaryColor(_color) {
  const color = _color || '';
  const primaryColors = ['red', 'blue', 'yellow'];

  return primaryColors.includes(color.toLowerCase());
}

/**
 * Helper function that returns if argument provided has a `disposition` property set as 'closed'
 * and that the color property is a primary color, re-using `isPrimaryColor` helper function
 *
 * @param {*} item - object - with properties to match against our validations
 * @returns boolean
 */
function isClosedAndPrimary(item) {
  return item['disposition'] === 'closed' && isPrimaryColor(item['color']);
}

/**
 * Helper function to transform the data into the expected format
 *
 * @param {*} data - string[] - represents the data as returned from the API 
 * @returns transformed object with the expected structure
 */
function transformData(data, page, offset) {
  // TODO: Caching data ?
  const ids = [];
  const opens = [];

  // Figuring out the next and previous pages
  const previousPage = page == 1 ? null : page - 1;
  const nextPage = data.length > settings.itemsPerPage ? page + 1 : null;

  // TODO: add another test & logic to ensure we have at least 10 items to iterate over
  for (let i = 0; i < settings.itemsPerPage; i++) {
    const pieceOfData = data[i];

    ids.push(pieceOfData.id);
    if (pieceOfData.disposition === 'open') {
      const newObj = Object.assign({}, pieceOfData, {
        isPrimary: isPrimaryColor(pieceOfData.color)
      });
      opens.push(newObj);
    }
  }

  // TODO: This object is created elsewhere, might be worth it to create a single instance
  // and clone it whenever is needed
  const finalData = {
    previousPage: previousPage,
    nextPage: nextPage,
    closedPrimaryCount: data.slice(0, settings.itemsPerPage).filter(isClosedAndPrimary).length,
    ids: ids,
    open: opens
  };

  return finalData;
}

/**
 * Retrieve function, to pr
 * @param {*} options - {page: number, colors: string[]} - available params, page defines which page we are 
 *    looking to retrieve and colors is an array of available colors
 * @returns expected object with correct format, even if no results come back from API, or connection is broken, object
 *    with same structure is returned
 */
function retrieve(options) {
  let page = 1;
  let colors = [];
  let offset = 0;

  // Validates we have some options to work with
  if (options) {
    // Page provided?
    if (options['page']) {
      page = Number(options['page']);
      offset = (page - 1) * settings.itemsPerPage;
    }

    // Color array provided?
    if (options['colors']) {
      colors = options['colors'];
    }
  }

  // URI object instance (https://medialize.github.io/URI.js/)
  const uri = new URI(window.path);

  // Adding a limit to the number of items to return
  // +1 so we know if we have a next page of records
  // also, to avoid retrieving too much data we are not going to use
  if (page) {
    uri.addSearch('limit', settings.itemsPerPage + 1);
  }

  // Adding the offset so we can narrow down results; offset always exists
  uri.addSearch('offset', offset);

  // If color array was provided, add it to the query string
  if (colors.length > 0) {
    uri.addSearch('color[]', colors);
  }

  return fetch(uri.toString())
    .then((response) => {
      // response status != 200
      if (!response.ok) {
        console.log('Something went wrong');
        return [];
      }

      return response.json();
    })
    .then((data) => {
      if (data && data.length) {
        return transformData(data, page, offset);
      }

      // no data returned from API, so returning 'empty' object
      const emptyResponse = {
        previousPage: null,
        nextPage: null,
        closedPrimaryCount: 0,
        ids: [],
        open: []
      };

      // validate if user requested something other than first page
      if (page > 1) {
        emptyResponse.previousPage = page - 1;
      }

      return emptyResponse;
    })
}

export default retrieve;
