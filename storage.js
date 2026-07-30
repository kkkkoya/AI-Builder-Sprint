// storage.js

// 1. 데이터를 저장하는 함수 (예: 사용자가 입력한 고민)
function saveData(key, value) {
    // 객체나 배열 같은 복잡한 데이터는 문자로 변환(JSON.stringify)해서 저장합니다.
    localStorage.setItem(key, JSON.stringify(value));
}

// 2. 데이터를 꺼내오는 함수
function loadData(key) {
    const data = localStorage.getItem(key);
    // 저장된 데이터가 있으면 다시 원래 형태(JSON.parse)로 되돌려줍니다.
    return data ? JSON.parse(data) : null;
}

// 3. 데이터를 지우는 함수 (상담이 다 끝나고 초기화할 때 사용)
function clearData(key) {
    localStorage.removeItem(key);
}