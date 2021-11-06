/* global Target, Command */
(async () => {
  const CITY_CODES = [
    { name: 'Bogotá', path: 'bogota', ecallId: 'Bog' },
    { name: 'Barranquilla', path: 'barranquilla', ecallId: 'Bar' },
    { name: 'Armenia', path: 'armenia', ecallId: 'Arm' },
    { name: 'Bucaramanga', path: 'bucaramanga', ecallId: 'Buc' },
    { name: 'Cartagena', path: 'cartagena', ecallId: 'Car' },
    { name: 'Ibagué', path: 'ibague', ecallId: 'Iba' },
    { name: 'Manizales', path: 'manizales', ecallId: 'Man' },
    { name: 'Medellín', path: 'medellin', ecallId: 'Med' },
    { name: 'Montería', path: 'monteria', ecallId: 'Mon' },
    { name: 'Cali', path: 'cali', ecallId: 'Cal' },
    { name: 'Pereira', path: 'pereira', ecallId: 'Per' },
    { name: 'Popayán', path: 'popayan', ecallId: 'Cau' },
    { name: 'Villavicencio', path: 'villavicencio', ecallId: 'Met' }];

  async function shouldFetch (path, formatted) {
    return await browser.runtime.sendMessage({ target: Target.STATE, command: Command.SHOULD_FETCH, content: { path, formatted } });
  }

  // copied from helper.js
  function target (target) {
    return {
      command: function (command) {
        return {
          do: function (consumer) {
            return function (message, sender, sendResponse) {
              return (message?.target === target && message?.command === command) &&
                Promise.resolve(consumer(message?.content, sender, sendResponse));
            };
          }
        };
      }
    };
  }

  function obtainDuration (tags) {
    const regexp = /(\d+)\s+Min/i;
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const match = tag.textContent?.match(regexp);
      if (match) {
        return Number.parseInt(match[1]);
      }
    }
  }

  function pad2 (n) {
    return n.toString().padStart(2, '0');
  }

  function format (date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function findCityId (path) {
    for (const code of CITY_CODES) {
      if (path.startsWith(`/${code.path}`)) {
        return code.ecallId;
      }
    }
  }

  function fetchShows (path, rawId, movie, len, formatted, cityId) {
    browser.runtime.sendMessage({ target: Target.STATE, command: Command.FETCH_SHOWS, content: { path, rawId, movie, len, formatted, cityId } });
  }

  async function fetchMovieShows (path) {
    const date = new Date();
    // fetch n days starting from current day
    for (let i = 0; i < 7; i++) {
      const formatted = format(date);
      if (await shouldFetch(path, formatted)) {
        const page = await fetch(new URL(path, location.origin)).then(res => res.text()).then(body => parser.parseFromString(body, 'text/html'));

        const rawId = page.querySelector('show-times')?.getAttribute('object-id');
        const movie = page.querySelector('h1.title')?.textContent;
        const len = obtainDuration(page.querySelectorAll('span.tag'));

        if (rawId) {
          fetchShows(path, rawId, movie ?? rawId, len, formatted, findCityId(path));
        }
      }
      date.setDate(date.getDate() + 1);
    }
  }

  function show (element) {
    element.style.display = '';
    // show the element (https://michalsnik.github.io/aos/)
    element.classList.add('aos-animate');
  }

  function hide (element) {
    element.style.display = 'none';
  }

  function showProvided (provided) {
    for (const item of document.getElementsByClassName('movie-item')) {
      if (provided.includes(item.getAttribute('href'))) {
        show(item.closest('div'));
      } else {
        hide(item.closest('div'));
      }
    }
  }

  function getItems () {
    return [...document.getElementsByClassName('movie-item')].map(h => h.getAttribute('href'));
  }

  const items = document.getElementsByClassName('movie-item');
  const paths = [...items].map(item => item.getAttribute('href')).filter(e => e);

  const parser = new DOMParser();
  paths.map(path => fetchMovieShows(path));

  browser.runtime.onMessage.addListener(target(Target.ACTUATOR).command(Command.SHOW_PROVIDED).do(showProvided));
  browser.runtime.onMessage.addListener(target(Target.ACTUATOR).command(Command.GET_ITEMS).do(getItems));
})();
