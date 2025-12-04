const API_KEY = "5d44c8cb9a9e2d710e993a8839e93d21"; // Ваш ключ

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weatherContent = document.getElementById("weatherContent");

const cityNameEl = document.querySelector(".city-name");
const tempEl = document.querySelector(".temperature");
const descEl = document.querySelector(".description");
const mainIconEl = document.querySelector(".main-icon");
const minTempEl = document.getElementById("minTemp");
const maxTempEl = document.getElementById("maxTemp");

const hourlyList = document.querySelector(".hourly-list");
const weekList = document.querySelector(".week-list");

// Слушатели событий
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) getWeather(city);
});
cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && cityInput.value.trim()) {
        getWeather(cityInput.value.trim());
    }
});

async function getWeather(city) {
    try {
        // 1. Геокодинг
        const geoRes = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoRes.json();
        
        if (!geoData.length) {
            alert("City not found");
            return;
        }

        const { lat, lon, name } = geoData[0];

        // 2. Прогноз погоды
        const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const data = await weatherRes.json();

        // Передаем имя из геокодинга, чтобы оно было точным
        updateUI(name, data);
        
    } catch (error) {
        console.error(error);
        alert("Error fetching data");
    }
}

function updateUI(city, data) {
    weatherContent.classList.remove("hidden");
    
    const current = data.list[0];
    cityNameEl.textContent = city;
    tempEl.textContent = Math.round(current.main.temp) + "°";
    descEl.textContent = current.weather[0].main; 
    mainIconEl.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}.png`;

    // --- ЛОГИКА СМЕНЫ ФОНА (18:00 - 06:00) ---
    
    // 1. Получаем смещение времени города в секундах
    const timezoneOffset = data.city.timezone; 
    
    // 2. Вычисляем текущее время UTC
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    
    // 3. Получаем время в целевом городе
    const cityTime = new Date(utc + (1000 * timezoneOffset));
    const currentHour = cityTime.getHours();

    // 4. Если время >= 18 или < 6, то это НОЧЬ
    if (currentHour >= 18 || currentHour < 6) {
        document.body.classList.add("night-theme");
        document.body.classList.remove("day-theme");
    } else {
        document.body.classList.add("day-theme");
        document.body.classList.remove("night-theme");
    }

    // --- Почасовой прогноз ---
    hourlyList.innerHTML = "";
    // Добавим "Сейчас"
    addHourlyItem("Now", current.weather[0].icon, current.main.temp);
    
    // Добавим следующие часы
    for (let i = 1; i <= 6; i++) {
        const item = data.list[i];
        // Для почасового прогноза нужно учитывать смещение времени, чтобы показывать местное время города
        const itemDate = new Date((item.dt * 1000) + (timezoneOffset * 1000) + (new Date().getTimezoneOffset() * 60000));
        
        let hours = itemDate.getHours();
        const timeStr = (hours < 10 ? '0' : '') + hours + ":00";
        
        addHourlyItem(timeStr, item.weather[0].icon, item.main.temp);
    }

    // --- Прогноз на неделю ---
    const dailyData = {};
    
    data.list.forEach(item => {
        // Получаем день недели
        const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' });
        if (!dailyData[date]) {
            dailyData[date] = { min: 100, max: -100, icon: item.weather[0].icon };
        }
        if (item.main.temp_min < dailyData[date].min) dailyData[date].min = item.main.temp_min;
        if (item.main.temp_max > dailyData[date].max) dailyData[date].max = item.main.temp_max;
        
        // Берем иконку середины дня (примерно 12:00-15:00)
        const hour = new Date(item.dt * 1000).getHours();
        if (hour >= 11 && hour <= 14) dailyData[date].icon = item.weather[0].icon;
    });

    // Обновляем High/Low в шапке
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    if(dailyData[todayName]) {
        maxTempEl.textContent = Math.round(dailyData[todayName].max);
        minTempEl.textContent = Math.round(dailyData[todayName].min);
    }

    weekList.innerHTML = "";
    Object.keys(dailyData).forEach((day, index) => {
        if (index > 4) return;
        
        const info = dailyData[day];
        const dayLabel = (day === todayName) ? "Today" : day;
        
        weekList.innerHTML += `
            <div class="day-row">
                <span>${dayLabel}</span>
                <img src="https://openweathermap.org/img/wn/${info.icon}.png" alt="icon">
                <div class="temp-bar-container">
                    <span class="temp-val">${Math.round(info.min)}°</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: 100%;"></div>
                    </div>
                    <span class="temp-val">${Math.round(info.max)}°</span>
                </div>
            </div>
        `;
    });
}

function addHourlyItem(time, icon, temp) {
    hourlyList.innerHTML += `
        <div class="hour-item">
            <span class="hour-time">${time}</span>
            <img src="https://openweathermap.org/img/wn/${icon}.png" alt="weather">
            <span class="hour-temp">${Math.round(temp)}°</span>
        </div>
    `;
}