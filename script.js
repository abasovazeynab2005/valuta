const apiKey = "53f88af2f06bd470214a0cc4";
const baseUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/`;

const banks = {
    ABC: { buy: 0.01, sell: -0.005 },
    NEW: { buy: 0.02, sell: -0.01 },
    AME: { buy: 0.015, sell: -0.015 },
    RED: { buy: 0.005, sell: -0.005 }
};

let rates = {};
let fromCurrency = "RUB";
let toCurrency = "USD";
let activeBank = "NEW";
let lastEdited = 'from'; 

const fromInput = document.getElementById('from-input');
const toInput = document.getElementById('to-input');
const fromRateInfo = document.getElementById('from-rate-info');
const toRateInfo = document.getElementById('to-rate-info');
const offlineNotice = document.getElementById('offline-notification');

function toggleOfflineNotice(show) {
    if (offlineNotice) offlineNotice.style.display = show ? 'block' : 'none';
}

function validateInput(inputElement) {
    let value = inputElement.value;
    value = value.replace(',', '.'); 
    value = value.replace(/[^0-9.]/g, ''); 
    
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }

    if (parts.length === 2 && parts[1].length > 6) {
        value = parts[0] + '.' + parts[1].substring(0, 6);
    }

    if (parseFloat(value) > 10000) {
        value = "10000";
    }

    inputElement.value = value;
    return value;
}

// Используем .then как ты просила ранее
function getRates() {
    if (fromCurrency === toCurrency) {
        rates = { [toCurrency]: 1 };
        calculate(lastEdited);
        return;
    }

    fetch(`${baseUrl}${fromCurrency}`)
        .then(response => {
            if (!response.ok) throw new Error();
            return response.json();
        })
        .then(data => {
            if (data.result === "success") {
                rates = data.conversion_rates;
                localStorage.setItem(`rates_${fromCurrency}`, JSON.stringify(rates));
                toggleOfflineNotice(false); 
                calculate(lastEdited);
            }
        })
        .catch(() => {
            toggleOfflineNotice(true); 
            loadFromCache();
        });
}

function loadFromCache() {
    const cached = localStorage.getItem(`rates_${fromCurrency}`);
    if (cached) {
        rates = JSON.parse(cached);
        calculate(lastEdited);
    }
}

function calculate(direction) {
    lastEdited = direction;
    const currentRate = rates[toCurrency];
    if (!currentRate) return;

    const reverseRate = 1 / currentRate;

    if (direction === 'from') {
        const val = validateInput(fromInput);
        if (val === "" || val === ".") { 
            toInput.value = ""; 
            updateBankInfo(); 
            return; 
        }
        toInput.value = (parseFloat(val) * currentRate).toFixed(4);
    } else {
        const val = validateInput(toInput);
        if (val === "" || val === ".") { 
            fromInput.value = ""; 
            updateBankInfo(); 
            return; 
        }
        fromInput.value = (parseFloat(val) * reverseRate).toFixed(4);
    }

    fromRateInfo.innerText = `1 ${fromCurrency} = ${currentRate.toFixed(4)} ${toCurrency}`;
    toRateInfo.innerText = `1 ${toCurrency} = ${reverseRate.toFixed(4)} ${fromCurrency}`;
    
    updateBankInfo();
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ БАНКА
function updateBankInfo() {
    const comm = banks[activeBank];
    
    // Определяем, какую сумму брать за основу. 
    // Если последний раз меняли правый инпут, считаем комиссии от него.
    const amount = lastEdited === 'from' 
        ? (parseFloat(toInput.value) || 0) 
        : (parseFloat(fromInput.value) || 0);

    // Логика: BUY (покупка банком) и SELL (продажа банком)
    const buy = amount * (1 - Math.abs(comm.buy)); 
    const sell = amount * (1 + Math.abs(comm.sell));
    
    // Если мы меняли ПРАВЫЙ инпут, то BUY/SELL показывают сколько это в ЛЕВОЙ валюте.
    // Если ЛЕВЫЙ — то в ПРАВОЙ. 
    document.getElementById('buy-value').innerText = amount > 0 ? buy.toFixed(2) : "0.00";
    document.getElementById('sell-value').innerText = amount > 0 ? sell.toFixed(2) : "0.00";
}

function setupButtons(containerId, type) {
    const buttons = document.querySelectorAll(`#${containerId} button`);
    buttons.forEach(btn => {
        btn.onclick = () => {
            if (btn.innerText === (type === 'from' ? fromCurrency : toCurrency) && type !== 'bank') return;

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (type === 'from') fromCurrency = btn.innerText;
            if (type === 'to') toCurrency = btn.innerText;
            if (type === 'bank') activeBank = btn.innerText;

            getRates(); 
        };
    });
}

fromInput.oninput = () => calculate('from');
toInput.oninput = () => calculate('to');

fromInput.onfocus = () => { lastEdited = 'from'; };
toInput.onfocus = () => { lastEdited = 'to'; };

window.addEventListener('online', () => {
    toggleOfflineNotice(false);
    getRates();
});
window.addEventListener('offline', () => toggleOfflineNotice(true));

setupButtons('from-tabs', 'from');
setupButtons('to-tabs', 'to');
setupButtons('bank-tabs', 'bank');

getRates();