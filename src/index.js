function onLoad() {
    initSelect();
}

function initSelect() {
    const select = $('select#ad-acc-select');
    select.select2({placeholder: "Выбрать", language: "ru"});
    select.on('select2:select', onAdCabinetSelect);
}

function onAdCabinetSelect(e) {
    const id = e.params.data.id;
    console.log(id);
}

$(document).ready(onLoad);
