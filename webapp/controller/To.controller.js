sap.ui.define([
    "./BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    'sap/m/MessageToast',
	'sap/m/SearchField'
],
    function (BaseController, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";

        var _this;
        var _oCaption = {};

        return BaseController.extend("zuitranpost.controller.To", {
            onInit: function () {
                _this = this;

                _this._aColumns = {};
                
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteTo").attachPatternMatched(this._routePatternMatched, this);
            },

            _routePatternMatched: function (oEvent) {
                _this.initializeComponent();
            },

            initializeComponent() {
                var aTableList = [];
                aTableList.push({
                    modCode: "TRANPOSTTOMOD",
                    tblSrc: "ZDV_TRANSPOST_TO",
                    tblId: "toTab",
                    tblModel: "to"
                });

                // aTableList.push({
                //     modCode: "TRANPOSTHUMOD",
                //     tblSrc: "ZDV_TRANSPOST_HU",
                //     tblId: "huTab",
                //     tblModel: "hu"
                // });

                _this.getColumns(aTableList);

                _this.closeLoadingDialog();
            },

            // onSearch(oEvent) {
            //     this.showLoadingDialog("Loading...");

            //     var aSmartFilter = this.getView().byId("sfbTranPost").getFilters();
            //     var sSmartFilterGlobal = "";
            //     if (oEvent) sSmartFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
            //     _aSmartFilter = aSmartFilter;
            //     _sSmartFilterGlobal = sSmartFilterGlobal;
            //     this.getTranPost(aSmartFilter, sSmartFilterGlobal);

            //     this.byId("btnAdd").setEnabled(true);
            //     this.byId("btnRefresh").setEnabled(true);
            // },

            // getTranPost(pFilters, pFilterGlobal) {
            //     _this.showLoadingDialog("Loading...");

            //     var oModel = this.getOwnerComponent().getModel();
            //     var oTable = _this.getView().byId("tranPostTab");

            //     oModel.read('/MRSet', {
            //         success: function (data, response) {
            //             console.log("MRSet", data)
            //             if (data.results.length > 0) {

            //                 data.results.forEach(item => {
            //                     if (item.CREATEDDT !== null)
            //                         item.CREATEDDT = _this.formatDate(item.CREATEDDT);
            //                 })

            //                 var aFilterTab = [];
            //                 if (oTable.getBinding("rows")) {
            //                     aFilterTab = oTable.getBinding("rows").aFilters;
            //                 }

            //                 var oJSONModel = new sap.ui.model.json.JSONModel();
            //                 oJSONModel.setData(data);
            //                 _this.getView().setModel(oJSONModel, "tranPost");
            //                 _this._tableRendered = "tranPostTab";

            //                 _this.onFilterBySmart("tranPost", pFilters, pFilterGlobal, aFilterTab);

            //                 _this.setRowReadMode("tranPost");
            //             }

            //             oTable.getColumns().forEach((col, idx) => {   
            //                 if (col._oSorter) {
            //                     oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
            //                 }
            //             });

            //             // if (oTable.getBinding("rows").aIndices.length > 0) {
            //             //     var aIndices = oTable.getBinding("rows").aIndices;
            //             //     var sDlvNo = _this.getView().getModel("outDelHdr").getData().results[aIndices[0]].DLVNO;
            //             //     _this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);
            //             //     _this.getOutDelDtl();
            //             // } else {
            //             //     _this.getView().getModel("ui").setProperty("/activeDlvNo", "");
            //             //     _this.getView().getModel("outDelDtl").setProperty("/results", []);
            //             // }
                        
            //             _this.closeLoadingDialog();
            //         },
            //         error: function (err) { 
            //             console.log("error", err)
            //             _this.closeLoadingDialog();
            //         }
            //     })
            // }
        });
    });
