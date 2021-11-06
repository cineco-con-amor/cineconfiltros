/* global Target, Command */

async function getItems () {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true });
  if (tabs.length > 0) {
    return await browser.tabs.sendMessage(tabs[0].id, { target: Target.ACTUATOR, command: Command.GET_ITEMS });
  }
  return [];
}

async function getShows (items) {
  return await browser.runtime.sendMessage({ target: Target.STATE, command: Command.GET_SHOWS, content: items });
}

function atTime (date, hours, min, sec, ms) {
  const newDate = new Date(date);
  newDate.setHours(hours, min, sec, ms);
  return newDate;
}

function atMidnight (date) {
  return atTime(date, 0, 0, 0, 0);
}

function createCheckbox (checkboxId, labelContent, { key, value }) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = checkboxId;
  checkbox.checked = true;
  checkbox.dataset[key] = value;

  const inner = document.createElement('div');
  inner.className = 'checkbox';
  if (typeof labelContent === 'function') {
    labelContent(inner);
  } else {
    inner.textContent = labelContent;
  }
  const label = document.createElement('label');
  label.htmlFor = checkboxId;
  label.append(inner);

  const container = document.createElement('div');
  container.append(checkbox);
  container.append(label);

  return container;
}

function addDays (days) {
  const group = document.getElementById('day-group');
  days.sort((a, b) => a - b).map(d => {
    const md = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const id = `day-${cleanUp(md)}`;
    const container = createCheckbox(id, label => {
      const dayOfMonth = document.createElement('div');
      dayOfMonth.className = 'day-of-month';
      dayOfMonth.textContent = d.getDate().toString();
      const weekDay = document.createElement('div');
      weekDay.className = 'day-of-week';
      weekDay.textContent = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();

      label.append(dayOfMonth);
      label.append(weekDay);
    }, { key: 'date', value: d.toString() });
    container.className = 'day container';
    return container;
  }).forEach(container => group.append(container));
}

function cleanUp (name) {
  return name.toLocaleLowerCase().replace(/[^\w]+/g, '-');
}

function addLanguages (languages) {
  const group = document.getElementById('language-group');
  languages.map(l => {
    const id = `lang-${cleanUp(l)}`;
    const container = createCheckbox(id, l, { key: 'lang', value: l });
    container.className = 'language container';
    return container;
  }).forEach(container => group.append(container));
}

function addFormats (formats) {
  const group = document.getElementById('format-group');
  formats.map(f => {
    const id = `format-${cleanUp(f)}`;
    const container = createCheckbox(id, f, { key: 'format', value: f });
    container.className = 'format container';
    return container;
  }).forEach(container => group.append(container));
}

function addVenues (venues) {
  const group = document.getElementById('venue-group');
  venues.map(v => {
    const id = `venue-${cleanUp(v)}`;
    const container = createCheckbox(id, v, { key: 'venue', value: v });
    container.className = 'venue container';
    return container;
  }).forEach(container => group.append(container));
}

function buildForm (shows) {
  const flatShows = Object.values(shows).flatMap(f => Object.values(f)).flat();
  const days = flatShows.map(ev => ev.datetime).map(date => atMidnight(date))
    .filter((d, i, a) => a.findIndex(d2 => d.getTime() === d2.getTime()) === i);
  const languages = flatShows.map(ev => ev.attributes.language)
    .filter((l, i, a) => a.indexOf(l) === i);
  const formats = flatShows.map(ev => ev.attributes.format)
    .filter((f, i, a) => a.indexOf(f) === i);
  const venues = flatShows.map(ev => ev.cinema.name)
    .filter((v, i, a) => a.indexOf(v) === i);

  addDays(days);
  addLanguages(languages);
  addFormats(formats);
  addVenues(venues);
}

function queryState () {
  const state = { dates: [], languages: [], formats: [], venues: [], fromTime: '00:00', toTime: '23:59' };
  for (const control of document.getElementsByTagName('input')) {
    if (control.type === 'checkbox') {
      if (control.checked) {
        if (control.dataset.date) { state.dates.push(new Date(control.dataset.date)); }
        if (control.dataset.lang) { state.languages.push(control.dataset.lang); }
        if (control.dataset.format) { state.formats.push(control.dataset.format); }
        if (control.dataset.venue) { state.venues.push(control.dataset.venue); }
      }
    } else if (control.type === 'time') {
      if (control.id === 'lower-time') {
        state.fromTime = control.value;
      } else if (control.id === 'upper-time') {
        state.toTime = control.value;
      }
    }
  }
  return state;
}

function filterByState (shows, state) {
  const [fromHour, fromMinute] = state.fromTime.split(':').map(v => Number.parseInt(v));
  const [toHour, toMinute] = state.toTime.split(':').map(v => Number.parseInt(v));
  const intervals = state.dates.map(d => ({
    lower: atTime(d, fromHour, fromMinute, 0, 0),
    upper: atTime(d, toHour, toMinute, 0, 0)
  }));

  return Object.entries(shows).filter(([_key, value]) => {
    const flattened = Object.values(value).flat();
    return flattened.some(f => {
      return intervals.some(i => i.lower <= f.datetime && f.datetime <= i.upper) &&
        state.languages.includes(f.attributes.language) &&
        state.formats.includes(f.attributes.format) &&
        state.venues.includes(f.cinema.name);
    });
  }).map(el => el[0]);
}

async function showProvided (provided) {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true });
  for (const tab of tabs) {
    browser.tabs.sendMessage(tab.id, { target: Target.ACTUATOR, command: Command.SHOW_PROVIDED, content: provided });
  }
}

function filterShows (shows) {
  const state = queryState();
  const filtered = filterByState(shows, state);
  showProvided(filtered);
}

function addListeners (shows) {
  for (const control of document.getElementsByTagName('input')) {
    control.addEventListener('change', () => filterShows(shows));
  }
}

function queryFormState () {
  const state = { checked: {}, values: {} };
  for (const control of document.getElementsByTagName('input')) {
    if (control.type === 'checkbox') {
      state.checked[control.id] = control.checked;
    } else if (control.type === 'time') {
      state.values[control.id] = control.value;
    }
  }
  return state;
}

function assignFormState (state) {
  for (const control of document.getElementsByTagName('input')) {
    if (control.type === 'checkbox') {
      control.checked = state.checked[control.id] ?? true;
    } else if (control.type === 'time') {
      if (state.values[control.id]) { control.value = state.values[control.id]; }
    }
  }
}

function saveFormState (state) {
  browser.runtime.sendMessage({ target: Target.STATE, command: Command.SAVE_FORM_STATE, content: state });
}

async function loadFormState () {
  return await browser.runtime.sendMessage({ target: Target.STATE, command: Command.LOAD_FORM_STATE });
}

async function main () {
  const items = await getItems();
  const shows = await getShows(items);

  buildForm(shows);
  const prevState = await loadFormState();
  assignFormState(prevState);
  filterShows(shows);

  addListeners(shows);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      const state = queryFormState();
      saveFormState(state);
    }
  });
}

main();
