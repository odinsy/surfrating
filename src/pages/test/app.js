const { createApp, ref, reactive, onMounted } = Vue;

const app = createApp({
  setup() {
    const JSON_BASE_PATH = '../../data/rankings/';
    const transliterate = window.slugify;

    // Реактивные переменные
    const currentCompetition = ref('rfs/rus');
    const currentCategory = ref('shortboard');
    const currentGender = ref('men');
    const tableData = reactive({ athletes: [] });
    const years = ref([]);
    const isLoading = ref(false);
    const errorMessage = ref('');
    const competitions = [
      { value: 'rfs/rus', label: 'Чемпионат России' },
      { value: 'rfs/kaliningrad', label: 'Чемпионат Калининградской области' }
    ];

    // Функция для получения диапазона лет
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

    // Функция для получения информации об аватаре
    function getAthleteAvatar(athlete) {
      const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
      const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');
      return `../../img/avatars/${avatarSlug}.jpg`;
    }

    // Функция для получения инициалов
    function getAthleteInitials(athlete) {
      const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
      return (surname[0] || '') + (firstName[0] || '');
    }

    // Функция для получения лучшего результата
    function getBestResult(athlete) {
      return athlete.best_result
        ? `${athlete.best_result.place} в ${athlete.best_result.year}`
        : 'Нет данных';
    }

    // Загрузка данных
    async function loadData(competition, category, gender) {
      const path = `${JSON_BASE_PATH}${competition}/${category}/${gender}.json?t=${Date.now()}`;
      try {
        const response = await fetch(path);
        return await response.json();
      } catch (error) {
        console.error('Error loading data:', error);
        return { headers: [], athletes: [] };
      }
    }

    // Обновление таблицы
    async function updateTable() {
      isLoading.value = true;
      errorMessage.value = '';
      try {
        const data = await loadData(
          currentCompetition.value,
          currentCategory.value,
          currentGender.value
        );

        if (!data || !data.athletes || data.athletes.length === 0) {
          errorMessage.value = 'Нет данных для отображения';
          return;
        }

        years.value = getYearsRange(data);
        tableData.athletes = data.athletes;
      } catch (error) {
        console.error('Error updating table:', error);
        errorMessage.value = 'Ошибка загрузки данных';
      } finally {
        isLoading.value = false;
      }
    }

    // Обработчики событий
    function handleCompetitionChange(competition) {
      currentCompetition.value = competition;
      updateTable();
    }

    function handleCategoryChange(category) {
      currentCategory.value = category;
      updateTable();
    }

    function handleGenderChange(gender) {
      currentGender.value = gender;
      updateTable();
    }

    // Инициализация
    onMounted(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const initialCategory = urlParams.get('category') || 'shortboard_men';
      const [category, gender] = initialCategory.split('_');

      currentCategory.value = category;
      currentGender.value = gender;

      updateTable();
    });

    return {
      // Состояние
      currentCompetition,
      currentCategory,
      currentGender,
      tableData,
      years,
      isLoading,
      errorMessage,
      competitions,

      // Методы
      getAthleteAvatar,
      getAthleteInitials,
      getBestResult,
      handleCompetitionChange,
      handleCategoryChange,
      handleGenderChange
    };
  }
});

app.use(ElementPlus);
app.mount('#app');
