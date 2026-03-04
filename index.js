// 1. CONFIGURATION
const API_KEY = "b1697f6813e7130928c43bd01007ff5f";

// 2. SELECTORS
const cityInput = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const locationBtn = document.querySelector("#location-btn");
const forecastCardsDiv = document.querySelector("#forecast-cards");
const historyList = document.querySelector("#history-list");
const cityNameDisplay = document.querySelector("#city-name");

// --- LIVE CLOCK LOGIC ---
let clockInterval; 
const updateLiveClock = (timezoneOffset) => {
    // Clear any existing clock timer before starting a new one
    if (clockInterval) clearInterval(clockInterval);
    
    // Select or create the clock display element
    let clockDisplay = document.querySelector("#live-clock");
    if (!clockDisplay) {
        clockDisplay = document.createElement("p");
        clockDisplay.id = "live-clock";
        // Adding digital styling directly in JS for a quick fix
        clockDisplay.style.fontSize = "1.1rem";
        clockDisplay.style.color = "#00d2ff";
        clockDisplay.style.marginBottom = "5px";
        clockDisplay.style.fontWeight = "bold";
        cityNameDisplay.before(clockDisplay);
    }

    clockInterval = setInterval(() => {
        const now = new Date();
        // Calculate the city's local time using the timezone offset (seconds)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const cityTime = new Date(utc + (1000 * timezoneOffset));
        
        clockDisplay.innerText = cityTime.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    }, 1000);
};

// 3. MAIN FETCH FUNCTION
const getWeatherData = async (city) => {
    if (!city) return;

    cityNameDisplay.innerText = "Analyzing...";

    try {
        // Force search to look for Pakistan locations first
        let searchQuery = city.toLowerCase().includes("pakistan") ? city : `${city},PK`;
        
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(searchQuery)}&units=metric&appid=${API_KEY}`
        );

        if (!response.ok) {
            // If Pakistan search fails, try a global search
            const globalResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
            );
            
            if (!globalResponse.ok) {
                if(globalResponse.status === 401) throw new Error("API Key Activation Pending. Please wait 1 hour.");
                if(globalResponse.status === 404) throw new Error("City not found. Try 'Peshawar' or 'Karachi'.");
                throw new Error("Server error.");
            }
            var data = await globalResponse.json();
        } else {
            var data = await response.json();
        }

        updateUI(data);
        getForecast(data.coord.lat, data.coord.lon);
        saveToHistory(data.name);

    } catch (error) {
        alert(error.message);
        cityNameDisplay.innerText = "Ready for Analysis";
    }
};

// 4. UI UPDATE
const updateUI = (data) => {
    cityNameDisplay.innerText = `${data.name}, ${data.sys.country}`;
    document.querySelector("#temp").innerText = Math.round(data.main.temp);
    document.querySelector("#wind").innerText = data.wind.speed;
    document.querySelector("#humidity").innerText = data.main.humidity;
    document.querySelector("#description").innerText = data.weather[0].description;
    document.querySelector("#main-icon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    // Start the clock for the specific city's timezone
    updateLiveClock(data.timezone);

    const statusDot = document.querySelector(".status-dot");
    if(statusDot) statusDot.style.background = "#00ff88"; 
};

// 5. 5-DAY FORECAST WITH RAIN PERCENTAGE
const getForecast = async (lat, lon) => {
    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    const data = await response.json();

    // Filter to get weather specifically for midday (12:00:00)
    const dailyData = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    forecastCardsDiv.innerHTML = dailyData.map(item => {
        const date = new Date(item.dt_txt).toLocaleDateString('en-US', { weekday: 'short' });
        
        // POP (Probability of Precipitation) is 0 to 1, so multiply by 100 for percentage
        const rainChance = Math.round(item.pop * 100);

        return `
            <div class="card">
                <p class="date">${date}</p>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon">
                <p>${Math.round(item.main.temp)}°C</p>
                <p style="font-size: 0.75rem; color: #4facfe; margin-top: 5px;">
                    💧 ${rainChance}% Rain
                </p>
            </div>
        `;
    }).join("");
};

// 6. GEOLOCATION (Auto-detect)
locationBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
        cityNameDisplay.innerText = "Locating...";
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`);
            const data = await res.json();
            getWeatherData(data.name);
        }, () => {
            alert("Location access denied.");
            cityNameDisplay.innerText = "Ready for Analysis";
        });
    }
});

// 7. HISTORY MANAGEMENT
const saveToHistory = (city) => {
    let history = JSON.parse(localStorage.getItem("livecon_history")) || [];
    if (!history.includes(city)) {
        history.unshift(city); 
        localStorage.setItem("livecon_history", JSON.stringify(history.slice(0, 5)));
        renderHistory();
    }
};

const renderHistory = () => {
    const history = JSON.parse(localStorage.getItem("livecon_history")) || [];
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = '<li>No recent searches</li>';
        return;
    }
    historyList.innerHTML = history.map(city => `
        <li onclick="getWeatherData('${city}')">${city}</li>
    `).join("");
};

// 8. EVENT LISTENERS
searchBtn.addEventListener("click", () => getWeatherData(cityInput.value.trim()));
cityInput.addEventListener("keypress", (e) => { if (e.key === "Enter") searchBtn.click(); });

// Initialization
window.onload = renderHistory;
