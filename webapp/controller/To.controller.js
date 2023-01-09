sap.ui.define([
    "./BaseController",
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
                
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteTo").attachPatternMatched(this._routePatternMatched, this);
            },

            _routePatternMatched: function (oEvent) {
                this.getView().setModel(new JSONModel({
                    sbu: oEvent.getParameter("arguments").sbu,
                    rsvList: oEvent.getParameter("arguments").rsvList
                }), "ui");

                _this.initializeComponent();
            },

            initializeComponent() {
                _this._aColumns = {};
                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);

                _this.showLoadingDialog("Loading...");
                _this.getCaption();

                var aTableList = [];
                aTableList.push({
                    modCode: "TRANPOSTTOMOD",
                    tblSrc: "ZDV_TRANSPOST_TO",
                    tblId: "toTab",
                    tblModel: "to"
                });

                aTableList.push({
                    modCode: "TRANPOSTHUMOD",
                    tblSrc: "ZDV_TRANSPOST_HU",
                    tblId: "huTab",
                    tblModel: "hu"
                });

                _this.getColumns(aTableList);
                _this.getTo();

                _this.closeLoadingDialog();
            },

            getTo() {
                _this.showLoadingDialog("Loading...");

                var oTable = _this.getView().byId("toTab");
                var oModel = _this.getOwnerComponent().getModel();
                var aRsvList = _this.getView().getModel("ui").getData().rsvList.toString().split("+");
                var aRsvData = [];

                aRsvList.forEach((item, idx) => {
                    var sFilter = "RSVKEY eq '" + item + "'";
                    oModel.read('/TOSet', {
                        urlParameters: {
                            "$filter": sFilter
                        },
                        success: function (data, response) {
                            aRsvData.push(data.results[0]);

                            if (idx == (aRsvList.length -1)) {
                                console.log("TOSet", aRsvData)

                                var aFilterTab = [];
                                if (oTable.getBinding("rows")) {
                                    aFilterTab = oTable.getBinding("rows").aFilters;
                                }

                                var oJSONModel = new JSONModel();
                                oJSONModel.setData({
                                    results: aRsvData
                                });

                                _this.getView().setModel(oJSONModel, "to");
                                _this._tableRendered = "toTab";
                                _this.onFilterByCol("to", aFilterTab);

                                _this.setRowReadMode("to");

                                oTable.getColumns().forEach((col, idx) => {   
                                    if (col._oSorter) {
                                        oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                                    }
                                });

                                _this.closeLoadingDialog();
                            }
                        },
                        error: function (err) { 
                            console.log("error", err)
                            _this.closeLoadingDialog();
                        }
                    })
                })
            },

            getHu() {
                var oModel = _this.getOwnerComponent().getModel();


                aRsvList.forEach((item, idx) => {
                    var sFilter = "RSVKEY eq '" + item + "'";
                    oModel.read('/TOSet', {
                        urlParameters: {
                            "$filter": sFilter
                        },
                        success: function (data, response) {
                            aRsvData.push(data.results[0]);

                            if (idx == (aRsvList.length -1)) {
                                console.log("TOSet", aRsvData)

                                var aFilterTab = [];
                                if (oTable.getBinding("rows")) {
                                    aFilterTab = oTable.getBinding("rows").aFilters;
                                }

                                var oJSONModel = new JSONModel();
                                oJSONModel.setData({
                                    results: aRsvData
                                });

                                _this.getView().setModel(oJSONModel, "to");
                                _this._tableRendered = "toTab";
                                _this.onFilterByCol("to", aFilterTab);

                                _this.setRowReadMode("to");

                                oTable.getColumns().forEach((col, idx) => {   
                                    if (col._oSorter) {
                                        oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                                    }
                                });

                                _this.closeLoadingDialog();
                            }
                        },
                        error: function (err) { 
                            console.log("error", err)
                            _this.closeLoadingDialog();
                        }
                    })
                })
            },

            onCellClickTo(oEvent) {
                var sIssPlant = oEvent.getParameters().rowBindingContext.getObject().ISSPLANT;
                var sIssSloc = oEvent.getParameters().rowBindingContext.getObject().ISSSLOC;
                var sIssMatNo = oEvent.getParameters().rowBindingContext.getObject().ISSMATNO;
                var sIssBatch = oEvent.getParameters().rowBindingContext.getObject().ISSBATCH;

                this.getView().getModel("ui").setProperty("/issPlant", sIssPlant);
                this.getView().getModel("ui").setProperty("/issSloc", sIssSloc);
                this.getView().getModel("ui").setProperty("/issMatNo", sIssMatNo);
                this.getView().getModel("ui").setProperty("/issBatch", sIssBatch);

                this.getHu();
                this.clearSortFilter("huTab");
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oCaptionParam = [];
                var oCaptionResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                // Form
                oCaptionParam.push({CODE: "DOCDT"});
                oCaptionParam.push({CODE: "POSTDT"});
                oCaptionParam.push({CODE: "MATSLIP"});
                oCaptionParam.push({CODE: "HDRTXT"});

                // MessageBox
                oCaptionParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oCaptionParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        oData.CaptionMsgItems.results.forEach(item => {
                            oCaptionResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oCaptionResult);
                        _this.getView().setModel(oJSONModel, "caption");

                        _oCaption = _this.getView().getModel("caption").getData();
                    },
                    error: function(err) {
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });
