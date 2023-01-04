/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zui_tranpost/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
