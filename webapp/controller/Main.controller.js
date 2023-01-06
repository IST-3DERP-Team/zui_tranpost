sap.ui.define([
    "./BaseController"
],
    function (BaseController) {
        "use strict";

        var _this;
        var _aSmartFilter;
        var _sSmartFilterGlobal;

        return BaseController.extend("zuitranpost.controller.Main", {
            onInit: function () {
                _this = this;
                _this.onInitBase(_this, "VER");

                _this.showLoadingDialog("Loading...");

                _this._aColumns = {};

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();

                _this.initializeComponent();
            },

            initializeComponent() {
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
                console.log("add")
                this._router.navTo("RouteTo", {
                    
                });
                console.log("add2")
            }
        });
    });
