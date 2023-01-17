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
        var _aSmartFilter;
        var _sSmartFilterGlobal;

        return BaseController.extend("zuitranpost.controller.Main", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();

                _this.initializeComponent();
            },

            initializeComponent() {
                this.getView().setModel(new JSONModel({
                    sbu: "VER" // temporary Sbu
                }), "ui");

                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);
                _this.showLoadingDialog("Loading...");
                

                _this.getIssPlant();
                _this.getWarehouse("");
                _this.getSloc("");

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

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("tranPostTab").addEventDelegate(oTableEventDelegate);

                _this.closeLoadingDialog();
            },

            getIssPlant() {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_TRANPOST_FILTER_CDS");
                oModel.read('/ZVB_3DERP_TRANPOST_ISSPLANT_SH', {
                    success: function (data, response) {
                        //console.log("IssPlant", data);
                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "issPlant");
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onSelectionChangeIssPlant(oEvent) {
                var sSelectedKey = this.getView().byId("cmbIssPlant").getSelectedKey();
                _this.getWarehouse(sSelectedKey);
                _this.getSloc(sSelectedKey);
            },

            getWarehouse(pFilter) {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_TRANPOST_FILTER_CDS");
                oModel.read('/ZVB_3DERP_TRANPOST_WHSE_SH', {
                    success: function (data, response) {
                        //console.log("Warehouse", data);
                        var aData = [];
                        if (pFilter) aData = { results: data.results.filter(x => x.DESCRIPTION == pFilter) };
                        else aData = data;

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(aData);
                        _this.getView().setModel(oJSONModel, "warehouse");
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            getSloc(pFilter) {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_TRANPOST_FILTER_CDS");
                oModel.read('/ZVB_3DERP_TRANPOST_SLOC_SH', {
                    success: function (data, response) {
                        //console.log("Sloc", data);
                        var aData = [];
                        if (pFilter) aData = { results: data.results.filter(x => x.PLANTCD == pFilter) };
                        else aData = data;

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(aData);
                        _this.getView().setModel(oJSONModel, "sloc");
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onAfterTableRender(pTableId) {
                //console.log("onAfterTableRendering", pTableId)
            },

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aSmartFilter = this.getView().byId("sfbTranPost").getFilters();
                var sSmartFilterGlobal = "";
                if (oEvent) sSmartFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                _aSmartFilter = aSmartFilter;
                _sSmartFilterGlobal = sSmartFilterGlobal;

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

                            data.results.forEach((item, idx) => {
                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = _this.formatDate(item.CREATEDDT);

                                if (idx == 0) item.ACTIVE = "X";
                                else item.ACTIVE = "";
                            })

                            var aFilterTab = [];
                            if (oTable.getBinding("rows")) {
                                aFilterTab = oTable.getBinding("rows").aFilters;
                            }

                            var oJSONModel = new JSONModel();
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
                _this.showLoadingDialog("Loading...");

                var oTable = this.byId("tranPostTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    _this.closeLoadingDialog();
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var aData = _this.getView().getModel("tranPost").getData().results;
                var oData;
                var sRsvList = "";
                var aDataUnique = [];
                var bDataUnique = true;
                var aRsvLockList = [];

                aOrigSelIdx.forEach(i => {
                    oData = aData[i];

                    var aDataUniqueFilter = aDataUnique.filter(x => x.issPlant == oData.ISSPLANT && x.moveType == oData.MOVETYPE)
                    if (aDataUniqueFilter.length == 0) {
                        console.log(oData)
                        aDataUnique.push({
                            issPlant: oData.ISSPLANT,
                            moveType: oData.MOVETYPE
                        })
                    }

                    if (aDataUnique.length > 1) bDataUnique = false;

                    // Lock Reservation
                    aRsvLockList.push({
                        Rsvno: oData.RSVNO,
                        Rsvyr: oData.RSVYEAR,
                        Rspos: oData.ITEM
                    })

                    sRsvList += oData.RSVNO + oData.RSVYEAR + oData.ITEM + "+";
                })

                if (sRsvList.length > 0) sRsvList = sRsvList.slice(0, -1);

                if (!bDataUnique) {
                    MessageBox.warning(_oCaption.ISSPLANT + " and " + _oCaption.MVTTYPE + " " + _oCaption.INFO_SHOULD_BE_SAME);
                    _this.closeLoadingDialog();
                    return;
                }

                var oModelLock = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
                var oParamLock = {
                    N_LOCK_MRTAB: aRsvLockList,
                    iv_count: 300,
                    N_LOCK_MRENQ: [],
                    N_LOCK_MRRETURN: []
                }

                oModelLock.create("/Lock_MRSet", oParamLock, {
                    method: "POST",
                    success: function(data, oResponse) {
                        console.log("Lock_MRSet", data);

                        if (data.N_LOCK_MRRETURN.results.filter(x => x.Type != "S").length == 0) {
                            _this.onRoute(sRsvList, oData.WAREHOUSE);
                        } else {
                            var oFilter = data.N_LOCK_MRRETURN.results.filter(x => x.Type != "S")[0];
                            MessageBox.warning(oFilter.Message);
                            _this.closeLoadingDialog();
                        }
                        
                    },
                    error: function(err) {
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            },

            onRoute(pRsvList, pWarehouse) {
                var oModel = _this.getOwnerComponent().getModel();

                if (pWarehouse) {
                    var sFilter = "WHSECD eq '" + pWarehouse + "'";
                    oModel.read('/WhseSet', {
                        urlParameters: {
                            "$filter": sFilter
                        },
                        success: function (data, response) {
                            console.log("WhseSet", data)
                            if (data.results.length > 0) {
                                _this.closeLoadingDialog();
                                
                                if (data.results[0].USETO == "X" && (data.results[0].USEHU == "02" || data.results[0].USEHU == "03")) {
                                    _this._router.navTo("RouteTo", {
                                        sbu: _this.getView().getModel("ui").getData().sbu,
                                        rsvList: pRsvList
                                    });
                                } else {
                                    _this._router.navTo("RouteMatDoc", {
                                        sbu: _this.getView().getModel("ui").getData().sbu,
                                        rsvList: pRsvList
                                    });
                                }
                            }
                        },
                        error: function (err) { 
                            console.log("error", err)
                            _this.closeLoadingDialog();
                        }
                    })
                } else {
                    _this.closeLoadingDialog();

                    _this._router.navTo("RouteMatDoc", {
                        sbu: _this.getView().getModel("ui").getData().sbu,
                        rsvList: pRsvList
                    });
                }
            },

            onRefresh() {
                this.getTranPost(_aSmartFilter, _sSmartFilterGlobal);
            },

            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (this.byId(oEvent.srcControl.sId).getBindingContext("tranPost")) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("tranPost").sPath;
                        
                        oTable.getModel("tranPost").getData().results.forEach(row => row.ACTIVE = "");
                        oTable.getModel("tranPost").setProperty(sRowPath + "/ACTIVE", "X"); 
                        
                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("tranPost") && row.getBindingContext("tranPost").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oCaptionParam = [];
                var oCaptionResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oCaptionParam.push({CODE: "SBU"});
                oCaptionParam.push({CODE: "MVTTYPE"});
                oCaptionParam.push({CODE: "ISSPLANT"});
                oCaptionParam.push({CODE: "RSVNO"});
                oCaptionParam.push({CODE: "WAREHOUSE"});
                oCaptionParam.push({CODE: "SLOC"});

                // MessageBox
                oCaptionParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                oCaptionParam.push({CODE: "INFO_SHOULD_BE_SAME"});
                
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
