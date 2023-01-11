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

        return BaseController.extend("zuitranpost.controller.MatDoc", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                var aTableList = [];
                aTableList.push({
                    modCode: "TRANPOSTMDMOD",
                    tblSrc: "ZDV_TRANSPOST_MD",
                    tblId: "matDocTab",
                    tblModel: "matDoc"
                });

                _this.getColumns(aTableList);
                
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
                _this._aColumns = {};
                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);

                _this.showLoadingDialog("Loading...");
                //_this.getTo();

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
                                huId: item.HUID,
                                huItem: item.HUITEM,
                                toQty: item.TOQTY,
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
                var sIssPlant = oEvent.getParameters().rowBindingContext.getObject().ISSPLANT;
                var sIssSloc = oEvent.getParameters().rowBindingContext.getObject().ISSSLOC;
                var sIssMatNo = oEvent.getParameters().rowBindingContext.getObject().ISSMATNO;
                var sIssBatch = oEvent.getParameters().rowBindingContext.getObject().ISSBATCH;

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
