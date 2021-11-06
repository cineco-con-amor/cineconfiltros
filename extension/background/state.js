/* global Target, Command */
import { target } from '/util/helper.js';

const theShows = {};
let formState = { checked: {}, values: {} };

function shouldFetch ({ path, formatted }) {
  return !(theShows[path] && theShows[path][formatted]);
}

function createMovieEvent ({ name, len, posterSrc, cinema, showtime, performance }) {
  return {
    movie: name,
    len,
    posterSrc,
    datetime: new Date(performance.DateTime),
    cinema: {
      name: cinema.Name,
      address: cinema.Address,
      city: cinema.City
    },
    attributes: showtime.attributes
  };
}

function saveShows ({ path, formatted, shows }) {
  if (!theShows[path]) {
    theShows[path] = {};
  }
  theShows[path][formatted] = shows;
}

async function fetchShows ({ path, rawId, movie, len, formatted, cityId }) {
  const url = new URL('/cineco/get-performances-by-params', 'https://funciones.cinecolombia.com');
  url.searchParams.append('name', rawId);
  url.searchParams.append('date', formatted);
  url.searchParams.append('city', cityId);
  const cinemas = await fetch(url).then(res => res.json());

  const shows = cinemas.flatMap(cinema => cinema.showtimes.flatMap(showtime =>
    showtime.performances.map(performance => ({ cinema, showtime, performance }))))
    .map(info => createMovieEvent({ name: movie ?? rawId, len, ...info }));

  saveShows({ path, formatted, shows });
}

function getShows (items) {
  const result = {};
  for (const [key, value] of Object.entries(theShows)) {
    if (items.includes(key)) {
      result[key] = value;
    }
  }
  return result;
}

function saveFormState (state) {
  formState = state;
}

function loadFormState () {
  return formState;
}

browser.runtime.onMessage.addListener(target(Target.STATE).command(Command.SHOULD_FETCH).do(shouldFetch));
browser.runtime.onMessage.addListener(target(Target.STATE).command(Command.FETCH_SHOWS).do(fetchShows));
browser.runtime.onMessage.addListener(target(Target.STATE).command(Command.GET_SHOWS).do(getShows));
browser.runtime.onMessage.addListener(target(Target.STATE).command(Command.SAVE_FORM_STATE).do(saveFormState));
browser.runtime.onMessage.addListener(target(Target.STATE).command(Command.LOAD_FORM_STATE).do(loadFormState));
