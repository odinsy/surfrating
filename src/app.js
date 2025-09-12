const JSON_PATHS = {
    'shortboard_men': './data/rankings/rfs/rus/shortboard/t5_ranking_men.json',
    'shortboard_women': './data/rankings/rfs/rus/shortboard/t5_ranking_women.json',
    'longboard_men': './data/rankings/rfs/rus/longboard/t5_ranking_men.json',
    'longboard_women': './data/rankings/rfs/rus/longboard/t5_ranking_women.json'
};

async function loadJSON(category) {
    try {
        const response = await fetch(JSON_PATHS[category]);
        if (!response.ok) throw new Error('Ошибка сети');

        const data = await response.json();

        return data.overall_ranking.slice(0, 5).map(item => {
            const athlete = data.athletes[item.athlete_id];
            const bestResult = item.best_result;

            return {
                Rank: item.rank,
                Name: athlete.name,
                SportRank: athlete.sport_rank || '—',
                Region: athlete.region,
                TotalPoints: item.total_points,
                BestResult: bestResult ? `${bestResult.place} в ${bestResult.event_year}` : 'Нет данных'
            };
        });
    } catch (error) {
        console.error('Ошибка загрузки JSON:', error);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', function() {
  if (!window.transliterate || !window.slugify) {
    console.error('Transliteration library not loaded!');
    return;
  }

  const transliterate = (text) => {
    try {
      return window.slugify(text, {
        lowercase: true,
        separator: '-'
      });
    } catch {
      return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
  }

  function createAthleteItem(athlete) {
      const [rawSurname, rawFirstName] = athlete.Name.split(/\s+/);
      const surnameSlug = transliterate(rawSurname || '');
      const firstNameChar = rawFirstName ? transliterate(rawFirstName)[0] : '';
      const avatarPath = `img/avatars/${surnameSlug}${firstNameChar ? `-${firstNameChar}` : ''}.jpg`;

      return `
          <div class="athlete-item">
              <div class="athlete-rank">${athlete.Rank}</div>
              <div class="athlete-avatar">
                  <img src="${avatarPath}"
                       alt="${athlete.Name}"
                       onerror="this.style.display='none'">
              </div>
              <div class="athlete-info">
                  <div class="athlete-name">${athlete.Name}</div>
                  <div class="athlete-region">${athlete.Region}</div>
              </div>
              <div class="athlete-points">${athlete.TotalPoints}</div>

              <div class="tooltip-item">
                  <div class="tooltip-header">
                      <div class="tooltip-meta">
                          <div class="tooltip-name">${athlete.Name}</div>
                          <div class="tooltip-region">${athlete.Region}</div>
                      </div>
                      <img src="${avatarPath}"
                           class="tooltip-avatar"
                           alt="${athlete.Name}"
                           onerror="this.style.display='none'">
                  </div>

                  <div class="tooltip-stats">
                      <div class="tooltip-stat">
                          <div class="tooltip-value">#${athlete.Rank}</div>
                          <div class="tooltip-label">Ранк</div>
                      </div>
                      <div class="tooltip-stat">
                          <div class="tooltip-value">${athlete.SportRank || '—'}</div>
                          <div class="tooltip-label">Разряд</div>
                      </div>
                      <div class="tooltip-stat">
                          <div class="tooltip-value">${athlete.BestResult}</div>
                          <div class="tooltip-label">Лучший результат</div>
                      </div>
                  </div>

                  <div class="tooltip-social">
                      <a href="https://topheats.ru" target="_blank">topheats.ru</a>
                  </div>
              </div>
          </div>
      `;
  }

  function createGroupHTML(data, title, link) {
      return `
          <h2 class="group-title">${title}</h2>
          ${data.map(athlete => createAthleteItem(athlete)).join('')}
          <a href="${link}" class="full-rankings-link">Полный рейтинг →</a>
      `;
  }

  async function init() {
      const categories = [
          {
              id: 'shortboard-men',
              title: 'Короткая доска, Мужчины',
              link: 'https://odinsy.github.io/topheats-rating/src/pages/rankings/index.html?category=shortboard_men'
          },
          {
              id: 'longboard-men',
              title: 'Длинная доска, Мужчины',
              link: 'https://odinsy.github.io/topheats-rating/src/pages/rankings/index.html?category=longboard_men'
          },
          {
              id: 'shortboard-women',
              title: 'Короткая доска, Женщины',
              link: 'https://odinsy.github.io/topheats-rating/src/pages/rankings/index.html?category=shortboard_women'
          },
          {
              id: 'longboard-women',
              title: 'Длинная доска, Женщины',
              link: 'https://odinsy.github.io/topheats-rating/src/pages/rankings/index.html?category=longboard_women'
          }
      ];

      for (const category of categories) {
          const [boardType, gender] = category.id.split('-');
          const jsonKey = `${boardType}_${gender}`;
          const data = await loadJSON(jsonKey);
          if (data.length > 0) {
              document.getElementById(category.id).innerHTML = createGroupHTML(
                  data,
                  category.title,
                  category.link
              );
          }
      }
  }

  init();
});
