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
        var _aHu = [];
        var _startUpInfo;

        return BaseController.extend("zuitranpost.controller.To", {
            onInit: function () {
                _this = this;

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
                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);

                _this.showLoadingDialog("Loading...");

                var oModelStartUp= new JSONModel();
                oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                    _startUpInfo = oModelStartUp.oData
                });

                setTimeout(() => {
                    _this.getTo();
                    _this.closeLoadingDialog();
                }, 500);

                var sCurrentDate = _this.formatDate(new Date());
                _this.byId("dpDocDt").setValue(sCurrentDate);
                _this.byId("dpPostDt").setValue(sCurrentDate);

                _this.byId("iptMatSlip").setMaxLength(10);
                _this.byId("iptHdrTxt").setMaxLength(25);

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("toTab").addEventDelegate(oTableEventDelegate);
                this.byId("huTab").addEventDelegate(oTableEventDelegate);

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

                                console.log("setRowReadMode")
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

            onPostTo() {
                _this.showLoadingDialog("Loading...");

                var oTable = this.byId("toTab");
                var aSelIdx = oTable.getSelectedIndices();
                var bProceed = true;

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    _this.closeLoadingDialog();
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var aData = _this.getView().getModel("to").getData().results;
                var oData;

                aOrigSelIdx.forEach(i => {
                    oData = aData[i];
                    if (parseFloat(oData.PICKQTY) == 0.0) {
                        bProceed = false;
                        MessageBox.warning(_oCaption.INFO_PICKQTY_GREATER_THAN_ZERO);
                        _this.closeLoadingDialog();
                    }
                });
                
                if (!bProceed) return;

                MessageBox.confirm(_oCaption.INFO_PROCEED_POST, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            var oParam = {
                                MsgTyp: "",
                                N_GOODSMVT_TPHDR: [],
                                N_GOODSMVT_TPDTL: [],
                                N_GOODSMVT_TPITEMS: [],
                                N_GOODSMVT_TPRET: []
                            };

                            oParam.N_GOODSMVT_TPHDR.push({
                                Docdt: _this.formatDate(new Date(_this.byId("dpDocDt").getValue())) + "T00:00:00",
                                Postdt: _this.formatDate(new Date(_this.byId("dpPostDt").getValue())) + "T00:00:00",
                                Matslip: _this.byId("iptMatSlip").getValue(),
                                Hdrtxt: _this.byId("iptHdrTxt").getValue(),
                                Username: _startUpInfo.id
                            });

                            aOrigSelIdx.forEach(i => {
                                oData = aData[i];

                                oParam.N_GOODSMVT_TPDTL.push({
                                    "Rsvno": oData.RSVNO, 
                                    "Rsvyr": oData.RSVYEAR, 
                                    "Rspos": oData.ITEM, 
                                    "Issmatno": oData.ISSMATNO, 
                                    "Issplant": oData.ISSPLANT, 
                                    "Isssloc": oData.ISSSLOC, 
                                    "Issbatch": oData.ISSBATCH, 
                                    "Movetype": oData.MOVETYPE, 
                                    "Entryqty": oData.PICKQTY, 
                                    "Entryuom": oData.UOM, 
                                    "Rcvmatno": oData.RCVMATNO, 
                                    "Rcvplant": oData.RCVPLANT, 
                                    "Rcvsloc": oData.RCVSLOC, 
                                    "Rcvbatch": oData.RCVBATCH
                                })
                            });

                            _aHu.forEach(item => {
                                oParam.N_GOODSMVT_TPITEMS.push({
                                    "Rsvno": item.rsvNo, 
                                    "Rsvyr": item.rsvYear, 
                                    "Rspos": item.item, 
                                    "Inthuid": item.huId, 
                                    "Huitem": item.huItem, 
                                    "Toqty": item.toQty, 
                                    "Baseuom": item.uom
                                })
                            })

                            console.log("GoodsMvt_Post_TPSet param", oParam)
                            var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                            oModelRFC.create("/GoodsMvt_Post_TPSet", oParam, {
                                method: "POST",
                                success: function(oResult, oResponse) {
                                    console.log("GoodsMvt_Post_TPSet", oResult, oResponse);
            
                                    if (oResult.MsgTyp == "S") {
                                        _this.unlockRsv();
                                    } else {
                                        var sMessage = oResult.N_GOODSMVT_TPRET.results[0].Message;
                                        MessageBox.error(sMessage);
                                    }
                                },
                                error: function(err) {
                                    sap.m.MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                    _this.closeLoadingDialog();
                                }
                            });
                            
                        }
                    }
                });
            },

            onCancelTo() {
                MessageBox.confirm(_oCaption.CONFIRM_PROCEED_CLOSE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            _this.unlockRsv();
                        }
                    }
                });
            },

            unlockRsv() {
                var aRsvLockList = [];
                _this.getView().getModel("to").getData().results.forEach(item => {
                    aRsvLockList.push({
                        Rsvno: item.RSVNO,
                        Rsvyr: item.RSVYEAR,
                        Rspos: item.ITEM
                    })
                })

                var oModelLock = _this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
                var oParamLock = {
                    N_UNLOCK_MRTAB: aRsvLockList,
                    N_UNLOCK_MRENQ: [],
                    N_UNLOCK_MRRETURN: []
                }

                oModelLock.create("/Unlock_MRSet", oParamLock, {
                    method: "POST",
                    success: function(data, oResponse) {
                        console.log("Unlock_MRSet", data);
                        _this.closeLoadingDialog();

                        if (data.N_UNLOCK_MRRETURN.results.filter(x => x.Type != "S").length == 0) {
                            _this._router.navTo("RouteMain", {}, true);
                        } else {
                            var oFilter = data.N_UNLOCK_MRRETURN.results.filter(x => x.Type != "S")[0];
                            MessageBox.warning(oFilter.Message);
                        }
                        
                    },
                    error: function(err) {
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            },

            getHu() {
                var oModel = _this.getOwnerComponent().getModel();
                var sPlant = _this.getView().getModel("ui").getData().issPlant;
                var sSloc = _this.getView().getModel("ui").getData().issSloc;
                var sMatNo = _this.getView().getModel("ui").getData().issMatNo;
                var sIssBatch = _this.getView().getModel("ui").getData().issBatch;

                var sFilter = "PLANTCD eq '" + sPlant + "' and SLOC eq '" + sSloc + "' and MATNO eq '" + sMatNo + 
                                "' and BATCH eq '" + sIssBatch + "'";
                oModel.read('/HUSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("HUSet", data)

                        if (data.results.length > 0) {
                            data.results.forEach(item => {
                                var aHu = _aHu.filter(x => x.huId == item.HUID && x.huItem == item.HUITEM);
                                if (aHu.length > 0) {
                                    item.TOQTY = aHu[0].toQty;
                                }
                            })
                        }

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "hu");
                        _this._tableRendered = "huTab";
                        _this.setRowReadMode("hu");
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            onEditHu() {
                var aRows = this.getView().getModel("hu").getData().results;
                
                if (aRows.length > 0) {
                    this.byId("btnEditHu").setVisible(false);
                    this.byId("btnRefreshHu").setVisible(false);
                    this.byId("btnSaveHu").setVisible(true);
                    this.byId("btnCancelHu").setVisible(true);

                    this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("hu").getData());
                    this.setRowEditMode("hu");
                } else {
                    MessageBox.warning(_oCaption.INFO_NO_DATA_EDIT);
                }
            },

            onRefreshHu() {
                _this.getHu();
            },

            onSaveHu() {
                var oTable = this.byId("huTab");
                var aEditedRows = this.getView().getModel("hu").getData().results.filter(item => item.Edited === true);

                if (aEditedRows.length > 0) {
                    aEditedRows.forEach((item, idx) => {

                        var aHu = _aHu.filter(x => x.huId == item.HUID && x.huItem == item.HUITEM);
                        if (aHu.length > 0) {
                            _aHu.forEach(x => {
                                if (x.huId == item.HUID && x.huItem == item.HUITEM) {
                                    x.toQty = item.TOQTY;
                                }
                            })
                        } else {
                            _aHu.push({
                                rsvNo: _this.getView().getModel("ui").getData().rsvNo,
                                rsvYear: _this.getView().getModel("ui").getData().rsvYear,
                                item: _this.getView().getModel("ui").getData().item,
                                huId: item.HUID,
                                huItem: item.HUITEM,
                                toQty: item.TOQTY,
                                uom: item.UOM,
                                plant: _this.getView().getModel("ui").getData().issPlant,
                                sloc: _this.getView().getModel("ui").getData().issSloc,
                                matNo: _this.getView().getModel("ui").getData().issMatNo,
                                batch: _this.getView().getModel("ui").getData().issBatch
                            })
                        }
                    })

                    // Sum for Picked Qty
                    _this.getView().getModel("to").getData().results.forEach((item, idx) => {
                        
                        var aHu = _aHu.filter(x => x.plant == item.ISSPLANT && 
                            x.sloc == item.ISSSLOC && x.matNo == item.ISSMATNO && x.batch == item.ISSBATCH);

                        var total = 0.0;

                        if (aHu.length > 0) {
                            aHu.forEach(x => {
                                total += parseFloat(x.toQty)
                            })
                        }

                        var sRowPath = "/results/" + idx.toString();
                        _this.getView().getModel("to").setProperty(sRowPath + "/PICKQTY", total.toString());
                    })

                    this.byId("btnEditHu").setVisible(true);
                    this.byId("btnRefreshHu").setVisible(true);
                    this.byId("btnSaveHu").setVisible(false);
                    this.byId("btnCancelHu").setVisible(false);
                    
                    _this.onRefreshHu();
                } else {
                    MessageBox.information(_oCaption.WARN_NO_DATA_MODIFIED);
                }
            },

            onCancelHu() {
                var aEditedRows = this.getView().getModel("hu").getData().results.filter(item => item.Edited === true);

                if (aEditedRows.length > 0) {
                    MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction == "Yes") {

                                this.byId("btnEditHu").setVisible(true);
                                this.byId("btnRefreshHu").setVisible(true);
                                this.byId("btnSaveHu").setVisible(false);
                                this.byId("btnCancelHu").setVisible(false);

                                _this.onRefreshHu();
                            }
                        }
                    });
                } else {
                    this.byId("btnEditHu").setVisible(true);
                    this.byId("btnRefreshHu").setVisible(true);
                    this.byId("btnSaveHu").setVisible(false);
                    this.byId("btnCancelHu").setVisible(false);

                    _this.onRefreshHu();
                }
            },

            onInputLiveChange(oEvent) {},

            onNumberLiveChange(oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                var dValue = oEvent.getParameters().value;

                _this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);
            },

            onCellClickTo(oEvent) {
                var sRsvNo = oEvent.getParameters().rowBindingContext.getObject().RSVNO;
                var sRsvYear = oEvent.getParameters().rowBindingContext.getObject().RSVYEAR;
                var sItem = oEvent.getParameters().rowBindingContext.getObject().ITEM;
                var sIssPlant = oEvent.getParameters().rowBindingContext.getObject().ISSPLANT;
                var sIssSloc = oEvent.getParameters().rowBindingContext.getObject().ISSSLOC;
                var sIssMatNo = oEvent.getParameters().rowBindingContext.getObject().ISSMATNO;
                var sIssBatch = oEvent.getParameters().rowBindingContext.getObject().ISSBATCH;

                this.getView().getModel("ui").setProperty("/rsvNo", sRsvNo);
                this.getView().getModel("ui").setProperty("/rsvYear", sRsvYear);
                this.getView().getModel("ui").setProperty("/item", sItem);
                this.getView().getModel("ui").setProperty("/issPlant", sIssPlant);
                this.getView().getModel("ui").setProperty("/issSloc", sIssSloc);
                this.getView().getModel("ui").setProperty("/issMatNo", sIssMatNo);
                this.getView().getModel("ui").setProperty("/issBatch", sIssBatch);

                this.getHu();
                this.onCellClick(oEvent);
                this.clearSortFilter("huTab");
            },

            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (oTable.getId().indexOf("toTab") >= 0) { 
                        var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["to"].sPath;
                        var oRow = this.getView().getModel("to").getProperty(sRowPath);

                        this.getView().getModel("ui").setProperty("/rsvNo", oRow.RSVNO);
                        this.getView().getModel("ui").setProperty("/rsvYear", oRow.RSVYEAR);
                        this.getView().getModel("ui").setProperty("/item", oRow.ITEM);
                        this.getView().getModel("ui").setProperty("/issPlant", oRow.ISSPLANT);
                        this.getView().getModel("ui").setProperty("/issSloc", oRow.ISSSLOC);
                        this.getView().getModel("ui").setProperty("/issMatNo", oRow.ISSMATNO);
                        this.getView().getModel("ui").setProperty("/issBatch", oRow.ISSBATCH);

                        this.getHu();

                        if (this.byId(oEvent.srcControl.sId).getBindingContext("to")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("to").sPath;
                            
                            oTable.getModel("to").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("to").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("to") && row.getBindingContext("to").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }
                    } else {
                        if (this.byId(oEvent.srcControl.sId).getBindingContext("hu")) {
                            var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("hu").sPath;
                            
                            oTable.getModel("hu").getData().results.forEach(row => row.ACTIVE = "");
                            oTable.getModel("hu").setProperty(sRowPath + "/ACTIVE", "X"); 
                            
                            oTable.getRows().forEach(row => {
                                if (row.getBindingContext("hu") && row.getBindingContext("hu").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                    row.addStyleClass("activeRow");
                                }
                                else row.removeStyleClass("activeRow")
                            })
                        }
                    }
                }
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
                oCaptionParam.push({CODE: "POSTTO"});
                oCaptionParam.push({CODE: "CANCELTO"});

                // MessageBox
                oCaptionParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                oCaptionParam.push({CODE: "INFO_NO_DATA_EDIT"});
                oCaptionParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                oCaptionParam.push({CODE: "CONFIRM_PROCEED_CLOSE"});
                oCaptionParam.push({CODE: "INFO_PROCEED_POST"});
                oCaptionParam.push({CODE: "INFO_PICKQTY_GREATER_THAN_ZERO"});
                
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
