'use strict';
const gulp = require('gulp');
const path = require('path');
const del = require('del');
const webpack = require('webpack');
const webpackconfig = require('./webpack.config.js');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const csscomb = require('gulp-csscomb');
const imagemin = require('gulp-imagemin');
const settings = require('./gulp-settings.js');
const gutil = require('gulp-util');
const pug = require('gulp-pug');
const sourcemaps = require('gulp-sourcemaps');
const cache = require('gulp-cached');
const postcssPlagins = [
	autoprefixer({
		browsers: ['last 2 version']
	})
];
// ES-2015 handler
const webpackHandler = (dev, cb) => {
	webpack(webpackconfig(dev), (err, stats) => {
		if (err) throw new gutil.PluginError('webpack', err);
		gutil.log('[webpack]', stats.toString({
			// output options
		}));
		cb();
	});
}

const allSass = () => {
	return gulp.src(
		[
			path.resolve(__dirname, settings.scssDir.entry + '*.scss'),
			'!' + path.resolve(__dirname, settings.scssDir.entry + settings.scssDir.mainFileName + '.scss')
		],
		{
			base: path.resolve(__dirname, settings.scssDir.entry)
		}
	)
	.pipe(sass().on('error', sass.logError))
	.pipe(postcss(postcssPlagins))
	.pipe(gulp.dest(path.resolve(__dirname, settings.scssDir.output)));
};

const mainSass = () => {
	const scssUrl = path.resolve(__dirname, settings.scssDir.entry + settings.scssDir.mainFileName);

	return gulp.src(
		scssUrl + '.scss',
		{
			base: scssUrl
		}
	)
	.pipe(sourcemaps.init())
	.pipe(sass().on('error', sass.logError))
	.pipe(postcss(postcssPlagins))
	.pipe(sourcemaps.write('./', {includeContent: true}))
	.pipe(gulp.dest(path.resolve(__dirname, settings.scssDir.mainFileOutput + settings.scssDir.mainFileName)))
	.pipe(browserSync.stream());
};

/*
 * all development tasks
*/
// compile from sass to css
gulp.task('sassTask', gulp.series(allSass, mainSass));

// compile ES-2015 to ES5;
// gulp.task('webpackDev', webpackHandler(true));
gulp.task(function webpackDev(cb) {
	webpackHandler(true, cb);
});

// compile from pug to html
gulp.task(function pugTask() {
	return gulp.src(
			path.resolve(__dirname, settings.pugDir.entry + '*.pug'),
			{
				base: path.resolve(__dirname, settings.pugDir.entry)
			}
		)
		.pipe(pug(
			{
				pretty: '\t'
			}
		).on('error', err => {
			console.log(err);
			cb();
		}))
		.pipe(gulp.dest(path.resolve(__dirname, settings.pugDir.output)));
});

// copy images
gulp.task(function copyImages() {
	return gulp.src(
		path.resolve(__dirname, settings.imagesDir.entry + '**/*'),
		{
			base: path.resolve(__dirname, settings.imagesDir.entry)
		}
	).pipe(gulp.dest(path.resolve(__dirname, settings.imagesDir.output)));
});

gulp.task(function watch(cb) {
	gulp.watch(
		path.resolve(__dirname, settings.scssDir.entry + '**/*.scss'),
		gulp.series('sassTask')
	);

	gulp.watch(
		path.resolve(__dirname, settings.pugDir.entry + '**/*.pug'),
		gulp.series('pugTask')
	);

	gulp.watch(
		path.resolve(__dirname, settings.jsDir.entry + '**/*.js'),
		gulp.series('webpackDev')
	);

	gulp.watch(
		path.resolve(__dirname, settings.imagesDir.entry + '**/*'),
		gulp.series('copyImages')
	);

	gulp.watch(
		[
			path.resolve(__dirname, settings.jsDir.output + '*.js'),
			'./*.html'
		],
		gulp.series('reloadPage')
	);

	cb();
});

gulp.task(function reloadPage(cb) {
	browserSync.reload();
	cb();
});

// server
const serve = (cb) => (
	browserSync.init({
		server: {
			baseDir: './',
			port: 3010,
			directory: true,
			notify: false
		}
	}, cb)
);

const clearScripts = (cb) => {
	let jsExceptStr = '';

	settings.jsNames.names.forEach(function(item, index) {
		jsExceptStr += ((index !== 0 ? '|' : '(') + item + '.js' + (index === settings.jsNames.names.length - 1 ? ')' : ''))
	});

	del(
		[
			path.resolve(__dirname, settings.jsDir.output + '*'),
			'!' + path.resolve(__dirname, settings.jsDir.output + '*' +jsExceptStr)
		]
	).then(paths => {
		cb();
	});
}

// build scripts
gulp.task('build', gulp.series(clearScripts, function(done) {
	done();
	let jsExceptStr = '';

	settings.jsNames.names.forEach(function(item, index) {
		jsExceptStr += ((index !== 0 ? '|' : '(') + item + '.js' + (index === settings.jsNames.names.length - 1 ? ')' : ''))
	});

	return gulp.src(
		[
			path.resolve(__dirname, settings.jsDir.entry + '*'),
			'!' + path.resolve(__dirname, settings.jsDir.entry + '*' + jsExceptStr),
			'!' + path.resolve(__dirname, settings.jsDir.entry + 'modules')
		],
		{
			base: path.resolve(__dirname, settings.jsDir.entry)
		}
	)
	.pipe(gulp.dest(settings.jsDir.output));
}));

/*
 * optimization on gulp dist
*/

const beautifyMainCss = () => {
	const cssUrl = path.resolve(__dirname, settings.scssDir.mainFileOutput + settings.scssDir.mainFileName);

	return gulp.src(
			`${cssUrl}.css`,
			{
				base: path.resolve(__dirname, settings.scssDir.output)
			}
		)
		.pipe(csscomb())
		.pipe(gulp.dest(cssUrl));
};

const beautifyOtherCss = () => {
	const cssUrl = path.resolve(__dirname, settings.scssDir.output);

	return gulp.src(
			[
				`${cssUrl}*.css`,
				`!${cssUrl}*min.css`
			],
			{
				base: cssUrl
			}
		)
		.pipe(csscomb())
		.pipe(gulp.dest(cssUrl));
};

// css beautify
gulp.task('beautify', gulp.parallel(beautifyMainCss, beautifyOtherCss));


// image optimization
gulp.task(function imagesOptimize() {
	const entry = path.resolve(__dirname, settings.imagesDir.entry + '**/*.+(png|jpg|gif|svg)');
	const output = path.resolve(__dirname, settings.imagesDir.output);

	return gulp.src(
		entry,
			{
				base: path.resolve(__dirname, settings.imagesDir.entry)
			}
		)
		.pipe(cache('imagesOptimize'))
		.pipe(imagemin())
		.pipe(gulp.dest(output));
})

// remove JS source map
gulp.task(function webpackDist(cb) {
	webpackHandler(false, cb);
});

gulp.task(function removeScssSourceMap(cb) {
	del(
		[
			path.resolve(settings.scssDir.output, '**/*.css.map'),
			path.resolve(__dirname, settings.scssDir.mainFileOutput + '*.css.map')
		]
	).then(paths => {
		cb();
	});
});

/*
 * run main development tasks
*/
gulp.task('clear', done => {
	cache.caches = {};
	done();
});
gulp.task('dist', gulp.series('build', 'webpackDist', 'imagesOptimize', 'removeScssSourceMap', 'beautify'));
gulp.task('default', gulp.parallel('clear', 'build', 'webpackDev', 'sassTask', 'copyImages', 'pugTask', 'watch', serve));
