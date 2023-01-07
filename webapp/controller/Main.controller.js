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
        var _aSmartFilter;
        var _sSmartFilterGlobal;

        return BaseController.extend("zuitranpost.controller.Main", {
            onInit: function () {
                _this = this;

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();

                _this.initializeComponent();
            },

            initializeComponent() {
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    sbu: "VER" // temporary Sbu
                }), "ui");

                _this._aColumns = {};
                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);

                _this.showLoadingDialog("Loading...");
                _this.getCaption();

                var aTableList = [];
                aTableList.push({
                    modCode: "TRANPOSTMOD",
                    tblSrc: "ZDV_TRANPOST",
                    tblId: "tranPostTab",
                    tblModel: "tranPost"
                });

                _this.getColumns(aTableList);

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_TRANPOST_FILTER_CDS");
                var oSmartFilter = this.getView().byId("sfbTranPost");
                oSmartFilter.setModel(oModel);

                this.byId("btnAdd").setEnabled(false);
                this.byId("btnRefresh").setEnabled(false);

                _this.closeLoadingDialog();
            },

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aSmartFilter = this.getView().byId("sfbTranPost").getFilters();
                var sSmartFilterGlobal = "";
                if (oEvent) sSmartFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                _aSmartFilter = aSmartFilter;
                _sSmartFilterGlobal = sSmartFilterGlobal;

                console.log("onsearch", aSmartFilter);

                this.getTranPost(aSmartFilter, sSmartFilterGlobal);

                this.byId("btnAdd").setEnabled(true);
                this.byId("btnRefresh").setEnabled(true);
            },

            getTranPost(pFilters, pFilterGlobal) {
                _this.showLoadingDialog("Loading...");

                var oModel = this.getOwnerComponent().getModel();
                var oTable = _this.getView().byId("tranPostTab");

                oModel.read('/MRSet', {
                    success: function (data, response) {
                        console.log("MRSet", data)
                        if (data.results.length > 0) {

                            data.results.forEach(item => {
                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = _this.formatDate(item.CREATEDDT);
                            })

                            var aFilterTab = [];
                            if (oTable.getBinding("rows")) {
                                aFilterTab = oTable.getBinding("rows").aFilters;
                            }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "tranPost");
                            _this._tableRendered = "tranPostTab";

                            _this.onFilterBySmart("tranPost", pFilters, pFilterGlobal, aFilterTab);

                            _this.setRowReadMode("tranPost");
                        }

                        oTable.getColumns().forEach((col, idx) => {   
                            if (col._oSorter) {
                                oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                            }
                        });

                        // if (oTable.getBinding("rows").aIndices.length > 0) {
                        //     var aIndices = oTable.getBinding("rows").aIndices;
                        //     var sDlvNo = _this.getView().getModel("outDelHdr").getData().results[aIndices[0]].DLVNO;
                        //     _this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);
                        //     _this.getOutDelDtl();
                        // } else {
                        //     _this.getView().getModel("ui").setProperty("/activeDlvNo", "");
                        //     _this.getView().getModel("outDelDtl").setProperty("/results", []);
                        // }
                        
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            onAdd() {
                var oTable = this.byId("tranPostTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    sap.m.MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var aData = _this.getView().getModel("tranPost").getData().results;
                var sRsvList = "";

                aOrigSelIdx.forEach(i => {
                    var oData = aData[i];
                    sRsvList += oData.RSVNO + "+" + oData.RSVYEAR + "+" + oData.ITEM + ",";
                })

                if (sRsvList.length > 0) sRsvList = sRsvList.slice(0, -1);

                this._router.navTo("RouteTo", {
                    sbu: _this.getView().getModel("ui").getData().sbu,
                    rsvList: sRsvList
                });
            },

            getCaption() {
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oDDTextParam.push({CODE: "SBU"});
                oDDTextParam.push({CODE: "MVTTYPE"});
                oDDTextParam.push({CODE: "ISSPLANT"});
                oDDTextParam.push({CODE: "RSVNO"});
                oDDTextParam.push({CODE: "WAREHOUSE"});
                oDDTextParam.push({CODE: "SLOC"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "caption");

                        _oCaption = _this.getView().getModel("caption").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });
