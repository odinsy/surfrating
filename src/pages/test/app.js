function domReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

// Глобальные функции для тултипов
window.showTooltip = function(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'block';
}

window.hideTooltip = function(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'none';
}

domReady(function() {
    const JSON_BASE_PATH = '../../data/rankings/';
    const transliterate = window.slugify;

    // Текущие параметры
    let currentCompetition = 'rfs/rus'; // Фиксированное значение
    let currentDiscipline = 'shortboard';
    let currentGender = 'men';

    // Основная инициализация
    const urlParams = new URLSearchParams(window.location.search);
    const initialDiscipline = urlParams.get('discipline') || 'shortboard';
    const initialGender = urlParams.get('gender') || 'men';

    currentDiscipline = initialDiscipline;
    currentGender = initialGender;

    // Названия дисциплин
    const DISCIPLINE_NAMES = {
        'shortboard': 'Короткая доска',
        'longboard': 'Длинная доска',
        'wakesurfing': 'Вейксерфинг',
        'wakeskim': 'Вейкским'
    };

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
        // Исправленный путь к аватаркам
        const avatarPath = `../../img/avatars/${currentCompetition}/${currentDiscipline}/${avatarSlug}.jpg`;

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
                            <div class="avatar-fallback">${initials || '?'}</div>
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
                <td class="year-points">
                    ${bestResult}
                </td>
                ${yearCells}
                <td class="total-points">${athlete.total_points}</td>
            </tr>
        `;
    }

    async function loadData(discipline, gender) {
        // Исправленный путь к данным
        const path = `${JSON_BASE_PATH}${currentCompetition}/${discipline}/${gender}.json?t=${Date.now()}`;

        console.log("Loading data from:", path); // Добавим логирование

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
            console.error('Full path:', path);
            return { headers: [], athletes: [] };
        }
    }

    async function updateTable(discipline, gender) {
        document.getElementById('ranking-table-container').innerHTML = `
            <div style="padding: 20px; background: white; border-radius: 8px; margin-top: 20px;">
                <h3>Загрузка данных...</h3>
                <p>Дисциплина: ${DISCIPLINE_NAMES[discipline] || discipline}</p>
                <p>Пол: ${gender === 'men' ? 'Мужчины' : 'Женщины'}</p>
            </div>
        `;

        try {
            const data = await loadData(discipline, gender);

            if (!data || !data.athletes || data.athletes.length === 0) {
                document.getElementById('ranking-table-container').innerHTML = `
                    <div class="error-message">
                        <p>Нет данных для отображения</p>
                        <p>Проверьте путь: ${JSON_BASE_PATH}${currentCompetition}/${discipline}/${gender}.json</p>
                    </div>
                `;
                return;
            }

            const years = getYearsRange(data);
            const tableHTML = `
                <div class="table-header">
                    <div class="discipline-title">${DISCIPLINE_NAMES[discipline] || discipline}</div>
                    <div class="gender-switch">
                        <button class="gender-btn ${gender === 'men' ? 'active' : ''}" data-gender="men">Мужчины</button>
                        <button class="gender-btn ${gender === 'women' ? 'active' : ''}" data-gender="women">Женщины</button>
                    </div>
                </div>
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

            // Добавляем обработчики для кнопок переключения пола
            document.querySelectorAll('.gender-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentGender = this.dataset.gender;
                    updateURL();
                    updateTable(currentDiscipline, currentGender);
                });
            });
        } catch (error) {
            console.error('Error updating table:', error);
            document.getElementById('ranking-table-container').innerHTML = `
                <div class="error-message">
                    <p>Произошла ошибка при загрузке данных</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    function updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('discipline', currentDiscipline);
        url.searchParams.set('gender', currentGender);
        window.history.replaceState(null, '', url);
    }

    // Обработчики событий для меню дисциплин
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentDiscipline = this.dataset.discipline;
            updateURL();
            updateTable(currentDiscipline, currentGender);
        });
    });

    // Первоначальная загрузка таблицы
    updateTable(currentDiscipline, currentGender);
});
