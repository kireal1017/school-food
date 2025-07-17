let API_KEY = ''

async function loadApiKey() {
  const res = await fetch('api.txt'); // api.txt에서 키 불러오기
  API_KEY = (await res.text()).trim(); // 불러온 키의 개행 제거

  initialize();   // 키를 불러온 뒤에 사용할 함수 호출
}

async function initialize() {
  const searchForm = document.getElementById('search-form');
  const schoolNameInput = document.getElementById('school-name');
  const schoolSelectArea = document.getElementById('school-select-area');
  const schoolSelect = document.getElementById('school-select');
  const selectSchoolBtn = document.getElementById('select-school-btn');
  const mealForm = document.getElementById('meal-form');
  const dateInput = document.getElementById('date');
  const resultDiv = document.getElementById('result');

  let selectedSchool = null;

  // 학교명으로 학교 목록 검색 (공식 NEIS 오픈API 사용)
  async function searchSchoolsByName(name) {
    const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&SCHUL_NM=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.schoolInfo || !data.schoolInfo[1] || !data.schoolInfo[1].row) return [];
    return data.schoolInfo[1].row;
  }

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultDiv.innerHTML = '';
    schoolSelectArea.style.display = 'none';
    mealForm.style.display = 'none';
    selectedSchool = null;
    const name = schoolNameInput.value.trim();
    if (!name) return;
    resultDiv.innerHTML = '학교 검색 중...';
    const schools = await searchSchoolsByName(name);
    if (schools.length === 0) {
      resultDiv.innerHTML = '검색 결과가 없습니다.';
      return;
    }
    // 학교 목록 드롭다운에 표시
    schoolSelect.innerHTML = '';
    schools.forEach((school, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = `${school.SCHUL_NM} (${school.LCTN_SC_NM}, ${school.ORG_RDNMA})`;
      schoolSelect.appendChild(option);
    });
    schoolSelectArea.style.display = 'block';
    resultDiv.innerHTML = '학교를 선택하세요.';
  });

  selectSchoolBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const idx = schoolSelect.value;
    if (idx === '' || idx === null) return;
    // 선택된 학교 정보 저장
    const name = schoolNameInput.value.trim();
    searchSchoolsByName(name).then(schools => {
      selectedSchool = schools[idx];
      if (!selectedSchool) {
        resultDiv.innerHTML = '학교 선택 오류';
        return;
      }
      mealForm.style.display = 'block';
      resultDiv.innerHTML = `${selectedSchool.SCHUL_NM} (${selectedSchool.LCTN_SC_NM})<br>급식 조회를 원하시면 날짜를 입력 후 조회하세요.`;
    });
  });

  function formatMenu(data) {
    if (!data || !data.mealServiceDietInfo) return '급식 정보가 없습니다.';
    const mealInfo = data.mealServiceDietInfo[1].row[0];
    let html = `<b>${mealInfo.MLSV_YMD} (${mealInfo.MMEAL_SC_NM})</b><br>`;
    html += mealInfo.DDISH_NM.replace(/<br\/>/g, '<br>').replace(/\./g, '').replace(/ /g, ' ');
    if (mealInfo.CAL_INFO) html += `<br><small>칼로리: ${mealInfo.CAL_INFO}</small>`;
    return html;
  }

  mealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedSchool) {
      resultDiv.innerHTML = '학교를 먼저 선택하세요.';
      return;
    }
    resultDiv.innerHTML = '급식 조회 중...';
    const date = dateInput.value.trim();
    let url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${selectedSchool.ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${selectedSchool.SD_SCHUL_CODE}`;
    if (date) url += `&MLSV_YMD=${date.replace(/-/g, '')}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
        resultDiv.innerHTML = '급식 정보가 없습니다.';
        return;
      }
      resultDiv.innerHTML = formatMenu(data);
    } catch (err) {
      resultDiv.innerHTML = '오류가 발생했습니다.';
    }
  });
}



