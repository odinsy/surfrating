const JSON_BASE_PATH = '../../data/rankings/';
const transliterate = window.slugify;

let currentSport = 'surfing';
let currentCompetition = 'rfs/rus';

const DISCIPLINE_OPTIONS = {
    surfing: [
        { value: 'shortboard', label: 'Короткая доска' },
        { value: 'longboard', label: 'Длинная доска' },
        { value: 'wakesurfing', label: 'Вейксерфинг' },
        { value: 'wakeskim', label: 'Вейкским' }
    ]
    // wakesurfing: [
    //     { value: 'wakesurfing', label: 'Вейксерфинг' },
    //     { value: 'wakeskim', label: 'Вейкским' }
    // ]
};

function updateDisciplineOptions(sport) {
    const select = document.getElementById('discipline-select');
    select.innerHTML = '';

    DISCIPLINE_OPTIONS[sport].forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        select.appendChild(opt);
    });
}

function getYearsRange(data) {
    if (!data.athletes) return [];

    const years = new Set();
    data.athletes.forEach(athlete => {
        if (athlete.years) {
            Object.keys(athlete.years).forEach(year => years.add(year));
        }
    });
    return Array.from(years).sort((a, b) => a - b);
}

function createAthleteRow(athlete, years) {
    const bestResult = athlete.best_result
        ? `${athlete.best_result.place} в ${athlete.best_result.year}`
        : 'Нет данных';

    const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
    const initials = (surname[0] || '') + (firstName[0] || '');
    const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');
    const avatarPath = `../../img/avatars/${avatarSlug}.jpg`;

    const yearCells = years.map(year => {
        const yearData = athlete.years?.[year];
        const events = yearData?.events || [];
        const tooltipId = `tooltip-${athlete.rank}-${year}`;

        const tooltipHTML = events.length
            ? `<div class="custom-tooltip" id="${tooltipId}">
                ${events.map(e => `
                    <div class="tooltip-event">
                        <div class="event-title">${e.name} ${year}</div>
                        <div class="event-detail">Место: ${e.place}</div>
                        <div class="event-detail">Очки: ${e.points}</div>
                    </div>
                `).join('')}
               </div>`
            : '';

        return `
            <td class="year-points"
                onmouseenter="showTooltip('${tooltipId}')"
                onmouseleave="hideTooltip('${tooltipId}')">
                ${yearData?.year_total_points || '—'}
                ${tooltipHTML}
            </td>
        `;
    }).join('');

    return `
        <tr class="${athlete.rank <= 10 ? 'top-athlete' : ''}">
            <td>${athlete.rank}</td>
            <td class="name-cell">
                <div class="avatar-wrapper">
                    <div class="athlete-avatar">
                        <img src="${avatarPath}"
                             alt="${athlete.name}"
                             onerror="this.style.display='none';
                                      this.nextElementSibling.style.display='flex'">
                        <div class="avatar-fallback">${initials}</div>
                    </div>
                    <div>
                        <div class="athlete-name">${athlete.name}</div>
                        <div class="athlete-region">${athlete.region}</div>
                    </div>
                </div>

                <div class="tooltip-item">
                    <div class="tooltip-header">
                        <div class="tooltip-meta">
                            <div class="tooltip-name">${athlete.name}</div>
                            <div class="tooltip-region">${athlete.region}</div>
                        </div>
                        <img src="${avatarPath}"
                             class="tooltip-avatar"
                             alt="${athlete.name}"
                             onerror="this.style.display='none'">
                    </div>

                    <div class="tooltip-stats">
                        <div class="tooltip-stat">
                            <div class="tooltip-value">#${athlete.rank}</div>
                            <div class="tooltip-label">Ранк</div>
                        </div>
                        <div class="tooltip-stat">
                            <div class="tooltip-value">${athlete.sport_rank || '—'}</div>
                            <div class="tooltip-label">Разряд</div>
                        </div>
                        <div class="tooltip-stat">
                            <div class="tooltip-value">${bestResult}</div>
                            <div class="tooltip-label">Лучший результат</div>
                        </div>
                    </div>

                    <div class="tooltip-social">
                        <a href="https://topheats.ru" target="_blank">topheats.ru</a>
                    </div>
                </div>
            </td>
            <td class="year-points best-tooltip"
                data-tooltip="${athlete.best_result?.event || 'Нет данных'}">
                ${bestResult}
            </td>
            ${yearCells}
            <td class="total-points">${athlete.total_points}</td>
        </tr>
    `;
}

async function loadData(sport, competition, category, gender) {
    const path = `${JSON_BASE_PATH}${sport}/${competition}/${category}/${gender}.json?t=${Date.now()}`;
    try {
        const response = await fetch(path);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return { headers: [], athletes: [] };
    }
}

async function updateTable(sport, competition, category, gender) {
    const data = await loadData(sport, competition, category, gender);

    if (!data || !data.athletes) {
        console.error('No data available');
        document.getElementById('ranking-table-container').innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    const years = getYearsRange(data);
    const tableHTML = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Best</th>
                    ${years.map(year => `<th>${year}</th>`).join('')}
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.athletes.map(a => createAthleteRow(a, years)).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('ranking-table-container').innerHTML = tableHTML;
}

function showTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'block';
}

function hideTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialSport = urlParams.get('sport') || 'surfing';
    const initialCompetition = urlParams.get('competition') || 'rfs/rus';
    const initialCategory = urlParams.get('category') || 'shortboard_men';
    const [category, gender] = initialCategory.split('_');

    currentSport = initialSport;
    currentCompetition = initialCompetition;

    // Устанавливаем активный вид спорта
    document.querySelectorAll('.sport-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sport === currentSport) {
            btn.classList.add('active');
        }
    });

    updateDisciplineOptions(currentSport);

    // Обработчики событий
    document.querySelectorAll('.sport-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentSport = this.dataset.sport;
            document.querySelectorAll('.sport-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateDisciplineOptions(currentSport);
            updateURL();
            const category = document.getElementById('discipline-select').value;
            const gender = document.querySelector('.gender-btn.active').dataset.gender;
            updateTable(currentSport, currentCompetition, category, gender);
        });
    });
    // Установка активной кнопки пола из URL
    const genderBtn = document.querySelector(`.gender-btn[data-gender="${gender}"]`);
    if (genderBtn) {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        genderBtn.classList.add('active');
    }

    // Обработчики событий
    document.getElementById('sport-select').addEventListener('change', function() {
        currentSport = this.value;
        updateDisciplineOptions(currentSport);
        updateURL();
        const category = document.getElementById('discipline-select').value;
        const gender = document.querySelector('.gender-btn.active').dataset.gender;
        updateTable(currentSport, currentCompetition, category, gender);
    });

    document.getElementById('discipline-select').addEventListener('change', function() {
        updateURL();
        const gender = document.querySelector('.gender-btn.active').dataset.gender;
        updateTable(currentSport, currentCompetition, this.value, gender);
    });

    // Обработчик для кнопок переключения пола
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateURL();
            const category = document.getElementById('discipline-select').value;
            updateTable(currentSport, currentCompetition, category, this.dataset.gender);
        });
    });

    document.querySelectorAll('.dropdown-item[data-competition]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentCompetition = this.dataset.competition;
            updateURL();
            const category = document.getElementById('discipline-select').value;
            const gender = document.querySelector('.gender-btn.active').dataset.gender;
            updateTable(currentSport, currentCompetition, category, gender);
        });
    });

    updateTable(currentSport, currentCompetition, category, gender);
});

function updateURL() {
    const url = new URL(window.location);
    const categorySelect = document.getElementById('discipline-select');
    const genderBtn = document.querySelector('.gender-btn.active');

    if (categorySelect && genderBtn) {
        const category = categorySelect.value;
        const gender = genderBtn.dataset.gender;
        url.searchParams.set('category', `${category}_${gender}`);
    }

    url.searchParams.set('sport', currentSport);
    url.searchParams.set('competition', currentCompetition);
    window.history.replaceState(null, '', url);
}
