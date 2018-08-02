const gulp = require('gulp')
const fs = require('fs')
const zip = require('gulp-zip')

function moveVendors() {
    const oldPath = 'dist/vendors~main.js'
    const newPath = 'library/vendors.js'
    fs.copyFileSync(oldPath, newPath)
}

gulp.task('move', () => {
    moveVendors()
    console.log('Successfully moved vendors')
})

const releaseFiles = ['librar?/**', 'index.html', 'Readme.txt', 'settings.js']
const outputArchive = 'LeadStats.zip'

function zipProject() {
    // 'librar?' because normal way (library) node-blob unpacks
    // every file in the dir and break dir structure. This way it works
    return new Promise((resolve) =>
        gulp
            .src(releaseFiles)
            .pipe(zip(outputArchive))
            .pipe(gulp.dest('./'))
            .on('end', resolve())
    )
}

const mockSettings = 'mock-settings.js'
const realSettings = 'settings.js'
const tempSettings = 'temp-settings.js'

function changeSettingsToMock() {
    fs.copyFileSync(realSettings, tempSettings)
    fs.copyFileSync(mockSettings, realSettings)
}

function changeMockSettingsToReal() {
    fs.renameSync(tempSettings, realSettings)
}

gulp.task('zip', () => {
    changeSettingsToMock()
    zipProject().then(() => {
        changeMockSettingsToReal()
        console.log('Successfully zipped project')
    })
})
