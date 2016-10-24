module.exports = {
	imagesDir: {
		entry: 'assets/images/',
		output: 'images/'
	},
	scssDir: {
		entry: 'assets/scss/',
		output: 'css/',
		mainFileName: 'style',
		mainFileOutput: './'
	},
	pugDir: {
		entry: 'assets/',
		output: ''
	},
	jsDir: {
		entry: 'assets/js/',
		output: 'js/'
	},
	jsNames: {
		names: ['main', 'jquery.main']
	}
};
