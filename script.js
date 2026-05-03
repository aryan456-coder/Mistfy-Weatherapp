const API_KEY = '6ed570ac911dad2a255e2965a53ced74';
  const BASE = 'https://api.openweathermap.org/data/2.5';
  const GEO = 'https://api.openweathermap.org/geo/1.0';
  const searchInput =document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const loader= document.getElementById('loader');
  const errorToast = document.getElementById('errorToast');
  const welcome = document.getElementById('welcome');
  const mainCard = document.getElementById('mainCard');
  const hourlySection = document.getElementById('hourlySection');
  const forecastSection = document.getElementById('forecastSection');
  const sunCard = document.getElementById('sunCard');
  const locBtn = document.getElementById('locBtn');
  const locBadge = document.getElementById('locBadge');

  function getEmoji(id, isNight = false) {
    if (isNight) {
      if (id >= 200 && id < 300) return '⛈️';
      if (id >= 300 && id < 400) return '🌧️';
      if (id >= 500 && id < 600) return '🌧️';
      if (id >= 600 && id < 700) return '❄️';
      if (id >= 700 && id < 800) return '🌫️';
      if (id === 800) return '🌙';
      return '☁️';
    }
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 400) return '🌦️';
    if (id >= 500 && id < 600) return '🌧️';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫️';
    if (id === 800) return '☀️';
    if (id === 801) return '🌤️';
    if (id === 802) return '⛅';
    if (id >= 803) return '☁️';
    return '🌡️';
  }

  function setTheme(weatherId, isNight) {
    const body = document.body;
    body.className = '';
    if (isNight) { body.classList.add('theme-night'); return; }
    if (weatherId >= 200 && weatherId < 300) body.classList.add('theme-thunderstorm');
    else if (weatherId >= 300 && weatherId < 600) body.classList.add('theme-rain');
    else if (weatherId >= 600 && weatherId < 700) body.classList.add('theme-snow');
    else if (weatherId >= 700 && weatherId < 800) body.classList.add('theme-fog');
    else if (weatherId === 800) body.classList.add('theme-clear');
    else body.classList.add('theme-clouds');
  }

  function fmtTime(unix, offset) {
    const d = new Date((unix + offset) * 1000);
    let h = d.getUTCHours(), m = d.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
  }

  function fmtDay(unix) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return days[new Date(unix * 1000).getDay()];
  }

  function fmtHour(unix, offset) {
    const d = new Date((unix + offset) * 1000);
    let h = d.getUTCHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}${ampm}`;
  }

  function showLoader() { loader.classList.add('show'); }
  function hideLoader() { loader.classList.remove('show'); }

  let toastTimer;
  function showError(msg) {
    errorToast.textContent = msg;
    errorToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => errorToast.classList.remove('show'), 3500);
  }

  function showSections(isLocation = false) {
    welcome.style.display = 'none';
    locBadge.style.display = isLocation ? 'inline-flex' : 'none';
    [mainCard, hourlySection, forecastSection, sunCard].forEach((el, i) => {
      el.style.display = 'block';
      el.style.animation = `fadeUp 0.6s ${i * 0.08}s both`;
    });
    sunCard.style.display = 'flex';
  }

  async function fetchWeatherByCoords(lat, lon) {
    showLoader();
    try {
      const [currRes, fcRes] = await Promise.all([
        fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
        fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
      ]);
      if (!currRes.ok) throw new Error('API error');
      const [curr, fc] = await Promise.all([currRes.json(), fcRes.json()]);
      hideLoader();
      renderCurrent(curr);
      renderHourly(fc.list, curr.timezone);
      renderForecast(fc.list);
      showSections(true);
      searchInput.value = curr.name;
    } catch (e) {
      hideLoader();
      showError('⚠️ Could not fetch weather for your location.');
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      showError('📍 Geolocation is not supported by your browser.');
      return;
    }
    // Visual feedback: spin the icon
    locBtn.classList.add('loading');
    locBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      pos => {
        locBtn.classList.remove('loading');
        locBtn.disabled = false;
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        locBtn.classList.remove('loading');
        locBtn.disabled = false;
        if (err.code === err.PERMISSION_DENIED) {
          showError('🚫 Location access denied. Please allow it in browser settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          showError('📡 Location unavailable. Try searching manually.');
        } else {
          showError('⏱️ Location request timed out. Try again.');
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  async function fetchWeather(city) {
    if (!city.trim()) return;
    showLoader();
    try {
      const currRes = await fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
      if (!currRes.ok) throw new Error('City not found');
      const curr = await currRes.json();
      const fcRes = await fetch(`${BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
      const fc = await fcRes.json();
      hideLoader();
      renderCurrent(curr);
      renderHourly(fc.list, curr.timezone);
      renderForecast(fc.list);
      showSections(false);
    } catch (e) {
      hideLoader();
      showError(e.message === 'City not found' ? '🌐 City not found. Try another name.' : '⚠️ Something went wrong. Check your API key.');
    }
  }

  function renderCurrent(d) {
    const offset = d.timezone;
    const now = new Date((Math.floor(Date.now()/1000) + offset) * 1000);
    const isNight = (Math.floor(Date.now()/1000) < d.sys.sunrise || Math.floor(Date.now()/1000) > d.sys.sunset);

    const wid = d.weather[0].id;
    const emoji = getEmoji(wid, isNight);

    setTheme(wid, isNight);

    document.getElementById('cityName').textContent = `${d.name}, ${d.sys.country}`;
    document.getElementById('cityDate').textContent = now.toUTCString().slice(0,22);

    document.getElementById('tempVal').textContent = Math.round(d.main.temp);
    document.getElementById('condIcon').textContent = emoji;
    document.getElementById('condText').textContent = d.weather[0].description;
    document.getElementById('bigIcon').textContent = emoji;

    document.getElementById('feelsLike').textContent = `${Math.round(d.main.feels_like)}°C`;
    document.getElementById('humidity').textContent   = `${d.main.humidity}%`;
    document.getElementById('windSpeed').textContent  = `${Math.round(d.wind.speed * 3.6)} km/h`;
    document.getElementById('visibility').textContent = d.visibility ? `${(d.visibility/1000).toFixed(1)} km` : '—';

    document.getElementById('sunriseTime').textContent = fmtTime(d.sys.sunrise, offset);
    document.getElementById('sunsetTime').textContent  = fmtTime(d.sys.sunset, offset);
  }

  function renderHourly(list, offset) {
    const wrap = document.getElementById('hourlyScroll');
    wrap.innerHTML = '';
    const first12 = list.slice(0, 12);
    first12.forEach((item, idx) => {
      const isNight = (item.sys && (item.sys.pod === 'n'));
      const emoji = getEmoji(item.weather[0].id, isNight);
      const div = document.createElement('div');
      div.className = 'hour-card' + (idx === 0 ? ' active' : '');
      div.innerHTML = `
        <span class="hour-time">${idx === 0 ? 'Now' : fmtHour(item.dt, offset)}</span>
        <span class="hour-icon">${emoji}</span>
        <span class="hour-temp">${Math.round(item.main.temp)}°</span>
      `;
      wrap.appendChild(div);
    });
  }

  function renderForecast(list) {
    const grid = document.getElementById('forecastGrid');
    grid.innerHTML = '';

    const days = {};
    list.forEach(item => {
      const d = new Date(item.dt * 1000);
      const key = d.toDateString();
      if (!days[key]) days[key] = [];
      days[key].push(item);
    });

    const dayKeys = Object.keys(days).slice(0, 5);
    dayKeys.forEach(key => {
      const entries = days[key];
      // Pick midday entry
      const mid = entries.find(e => {
        const h = new Date(e.dt * 1000).getUTCHours();
        return h >= 11 && h <= 14;
      }) || entries[Math.floor(entries.length / 2)];

      const high = Math.round(Math.max(...entries.map(e => e.main.temp_max)));
      const low  = Math.round(Math.min(...entries.map(e => e.main.temp_min)));
      const emoji = getEmoji(mid.weather[0].id, false);
      const day = fmtDay(mid.dt);

      const card = document.createElement('div');
      card.className = 'forecast-card';
      card.innerHTML = `
        <span class="fc-day">${day}</span>
        <span class="fc-icon">${emoji}</span>
        <div class="fc-temps">
          <span class="fc-high">${high}°</span>
          <span class="fc-low">${low}°</span>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  searchBtn.addEventListener('click', () => fetchWeather(searchInput.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchWeather(searchInput.value);
  });
  locBtn.addEventListener('click', useMyLocation);

  window.addEventListener('load', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        ()  => fetchWeather('London'),
        { timeout: 6000, maximumAge: 60000 }
      );
    } else {
      fetchWeather('London');
    }
  });