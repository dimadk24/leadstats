let ad_cabinet_id = 0;
let file_content = '';

function onLoad() {
    initSelect();
    initDropzone();
}

function initSelect() {
    const select = $('select#ad-acc-select');
    select.select2({placeholder: "Выбрать", language: "ru"});
    select.on('select2:select', (e) => ad_cabinet_id = e.params.data.id);
}

const dropzone_hover_class = 'dropzone-hover';

function onDragEnter() {
    this.classList.add(dropzone_hover_class);
}

function onDragLeave() {
    this.classList.remove(dropzone_hover_class);
}

function dragOver(e) {
    e.stopPropagation();
    e.preventDefault();
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => file_content = e.target.result;
    reader.readAsText(file)
}

function onDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    // noinspection JSUnresolvedVariable
    readFile(e.dataTransfer.files[0]);
}

function initDropzone() {
    const dropzone = document.getElementById("dropzone");
    dropzone.addEventListener("dragenter", onDragEnter);
    dropzone.addEventListener("dragleave", onDragLeave);
    dropzone.addEventListener("dragover", dragOver);
    dropzone.addEventListener("drop", onDrop);
}

$(document).ready(onLoad);
