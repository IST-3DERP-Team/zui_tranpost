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

        return BaseController.extend("zuitranpost.controller.MatDoc", {
            onInit: function () {
                _this = this;

                _this.getCaption();
                
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteMatDoc").attachPatternMatched(this._routePatternMatched, this);
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

                _aHu = [];

                var aTableList = [];
                aTableList.push({
                    modCode: "TRANPOSTMDMOD",
                    tblSrc: "ZDV_TRANSPOST_MD",
                    tblId: "matDocTab",
                    tblModel: "matDoc"
                });

                _this.getColumns(aTableList);

                var oModelStartUp= new JSONModel();
                oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                    _startUpInfo = oModelStartUp.oData
                });
            
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

                this.byId("matDocTab").addEventDelegate(oTableEventDelegate);

                _this.closeLoadingDialog();
            },

            onAfterTableRender(pTableId) {
                //console.log("onAfterTableRendering", pTableId)
                if (pTableId == "matDocTab") {
                    _this.getMatDoc();
                }
            },

            getMatDoc() {
                _this.showLoadingDialog("Loading...");

                var oTable = _this.getView().byId("matDocTab");
                var oModel = _this.getOwnerComponent().getModel();
                var aRsvList = _this.getView().getModel("ui").getData().rsvList.toString().split("+");
                var aRsvData = [];

                aRsvList.forEach((item, idx) => {
                    var sFilter = "RSVKEY eq '" + item + "'";
                    oModel.read('/MatDocSet', {
                        urlParameters: {
                            "$filter": sFilter
                        },
                        success: function (data, response) {
                            aRsvData.push(data.results[0]);

                            if (idx == (aRsvList.length -1)) {
                                console.log("MatDoc", aRsvData)

                                aRsvData.forEach(item => {
                                    item.TOQTY = null;
                                })

                                var aData = { results: aRsvData };
                                if (aData.results.length > 0) {
                                    aData.results.forEach((itemData, idxData) => {
                                        if (idxData == 0) itemData.ACTIVE = "X";
                                        else itemData.ACTIVE = "";
                                    })
                                }

                                var aFilterTab = [];
                                if (oTable.getBinding("rows")) {
                                    aFilterTab = oTable.getBinding("rows").aFilters;
                                }

                                var oJSONModel = new JSONModel();
                                oJSONModel.setData(aData);

                                _this.getView().setModel(oJSONModel, "matDoc");
                                _this._tableRendered = "matDocTab";
                                _this.onFilterByCol("matDoc", aFilterTab);

                                _this.setRowReadMode("matDoc");

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

                var oTable = this.byId("matDocTab");
                var aSelIdx = oTable.getSelectedIndices();
                var sErrMsg = "";

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    _this.closeLoadingDialog();
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var aData = _this.getView().getModel("matDoc").getData().results;
                var oData;

                aOrigSelIdx.forEach(i => {
                    oData = aData[i];
                    var sKey = oData.RSVNO + "-" + oData.RSVYEAR + "-" + oData.ITEM;

                    if (oData.RQQTYRESTRICT == "X" && oData.TOQTY != oData.BALANCE) {
                        sErrMsg += sErrMsg += sKey + " = " + _oCaption.INFO_TOQTY_EQ_BALANCE + "\n";
                    } else if (parseFloat(oData.TOQTY) == 0.0) {
                        sErrMsg += sKey + " = " + _oCaption.INFO_TOQTY_GREATER_THAN_ZERO + "\n";                        
                    }
                });
                
                if (sErrMsg.length > 0) {
                    sErrMsg = _oCaption.INFO_POST_FAIL + ":\n" + sErrMsg;
                    MessageBox.warning(sErrMsg);
                    _this.closeLoadingDialog();
                    return;
                }

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
                                    "Entryqty": oData.TOQTY, 
                                    "Entryuom": oData.UOM, 
                                    "Unloadpt": oData.RSVNO + oData.ITEM,
                                    "Rcvmatno": oData.RCVMATNO, 
                                    "Rcvplant": oData.RCVPLANT, 
                                    "Rcvsloc": oData.RCVSLOC, 
                                    "Rcvbatch": oData.RCVBATCH
                                })

                                oParam.N_GOODSMVT_TPITEMS.push({
                                    "Rsvno": oData.RSVNO,
                                    "Rsvyr": oData.RSVYEAR,
                                    "Rspos":  oData.ITEM, 
                                    "Toqty": oData.TOQTY, 
                                    "Baseuom": oData.UOM, 
                                })
                            });

                            console.log("GoodsMvt_Post_TPSet param", oParam)
                            var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                            oModelRFC.create("/GoodsMvt_Post_TPSet", oParam, {
                                method: "POST",
                                success: function(oResult, oResponse) {
                                    console.log("GoodsMvt_Post_TPSet", oResult, oResponse);
            
                                    if (oResult.MsgTyp == "S") {
                                        var sMessage = oResult.N_GOODSMVT_TPRET.results[0].Message;
                                        MessageBox.confirm(sMessage, {
                                            actions: ["Ok"],
                                            onClose: function (sAction) {
                                                if (sAction == "Ok") {
                                                    _this.unlockRsv();
                                                }
                                            }
                                        });
                                    } else {
                                        var sMessage = oResult.N_GOODSMVT_TPRET.results[0].Message;
                                        MessageBox.error(sMessage);
                                        _this.closeLoadingDialog();
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
                _this.getView().getModel("matDoc").getData().results.forEach(item => {
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

                        _this._router.navTo("RouteMain", {}, true);
                        // if (data.N_UNLOCK_MRRETURN.results.filter(x => x.Type != "S").length == 0) {
                        //     _this._router.navTo("RouteMain", {}, true);
                        // } else {
                        //     var oFilter = data.N_UNLOCK_MRRETURN.results.filter(x => x.Type != "S")[0];
                        //     MessageBox.warning(oFilter.Message);
                        // }
                        
                    },
                    error: function(err) {
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            },

            onEdit() {
                var aRows = this.getView().getModel("matDoc").getData().results;
                
                if (aRows.length > 0) {
                    this.byId("btnEdit").setVisible(false);
                    this.byId("btnRefresh").setVisible(false);
                    this.byId("btnSave").setVisible(true);
                    this.byId("btnCancel").setVisible(true);

                    this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("matDoc").getData());
                    this.setRowEditMode("matDoc");
                } else {
                    MessageBox.warning(_oCaption.INFO_NO_DATA_EDIT);
                }
            },

            onRefresh() {
                _this.getMatDoc();
            },

            onSave() {
                var oTable = this.byId("matDocTab");
                var aEditedRows = this.getView().getModel("matDoc").getData().results.filter(item => item.Edited === true);

                if (aEditedRows.length > 0) {
                    // Validation UOM
                    var bErr = false;
                    var sUom = "";
                    var iUomDecimal = 0;

                    aEditedRows.forEach((item, idx) => {
                        var aNum = parseFloat(item.TOQTY).toString().split(".");

                        if (item.UOMDECIMAL == 0) {
                            if (!Number.isInteger(parseFloat(item.TOQTY))) bErr = true;
                        } else if (item.UOMDECIMAL > 0) {
                            if (aNum.length == 1) bErr = true;
                            else if (aNum[1].length != item.UOMDECIMAL) bErr = true;
                        }

                        if (bErr) {
                            sUom = item.UOM;
                            iUomDecimal = item.UOMDECIMAL;
                        }
                    });

                    if (bErr) {
                        var sErrMsg = "UOM " + sUom + " should only have " + iUomDecimal.toString() + " decimal place(s).";
                        MessageBox.warning(sErrMsg);
                        return;
                    }

                    this.byId("btnEdit").setVisible(true);
                    this.byId("btnRefresh").setVisible(true);
                    this.byId("btnSave").setVisible(false);
                    this.byId("btnCancel").setVisible(false);
                    
                    _this.setRowReadMode("matDoc");
                } else {
                    MessageBox.information(_oCaption.WARN_NO_DATA_MODIFIED);
                }
            },

            onCancel() {
                var aEditedRows = this.getView().getModel("matDoc").getData().results.filter(item => item.Edited === true);

                if (aEditedRows.length > 0) {
                    MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
                        actions: ["Yes", "No"],
                        onClose: function (sAction) {
                            if (sAction == "Yes") {

                                this.byId("btnEdit").setVisible(true);
                                this.byId("btnRefresh").setVisible(true);
                                this.byId("btnSave").setVisible(false);
                                this.byId("btnCancel").setVisible(false);

                                _this.getView().getModel("matDoc").setProperty("/", _this._oDataBeforeChange);
                            }
                        }
                    });
                } else {
                    this.byId("btnEdit").setVisible(true);
                    this.byId("btnRefresh").setVisible(true);
                    this.byId("btnSave").setVisible(false);
                    this.byId("btnCancel").setVisible(false);

                    _this.getView().getModel("matDoc").setProperty("/", _this._oDataBeforeChange);
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

            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    if (this.byId(oEvent.srcControl.sId).getBindingContext("matDoc")) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext("matDoc").sPath;
                        
                        oTable.getModel("matDoc").getData().results.forEach(row => row.ACTIVE = "");
                        oTable.getModel("matDoc").setProperty(sRowPath + "/ACTIVE", "X"); 
                        
                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("matDoc") && row.getBindingContext("matDoc").sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
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
                oCaptionParam.push({CODE: "INFO_TOQTY_GREATER_THAN_ZERO"});
                oCaptionParam.push({CODE: "INFO_POST_FAIL"});
                oCaptionParam.push({CODE: "INFO_TOQTY_EQ_BALANCE"});
                
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
