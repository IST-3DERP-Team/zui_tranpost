sap.ui.define([

    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
  ], function (Controller, UIComponent) {
  
    "use strict";

    var _aTable = [];

    var SortOrder = library.SortOrder;
    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
    var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
    var sapDateTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd HH24:MI:SS" });
    var sapTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:ss a"});
   
    return Controller.extend("zuitranpost.controller.BaseController", {
   
        getColumns: async function(pAppId, pTableList) {
            _aTable = pTableList;

            var oModelColumns = new JSONModel();
            var sPath = jQuery.sap.getModulePath("zuioutdel", "/model/columns.json")
            await oModelColumns.loadData(sPath);

            var oColumns = oModelColumns.getData();
            var oModel = this.getOwnerComponent().getModel();

            oModel.metadataLoaded().then(() => {
                pTableList.forEach(item => {
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, item.modCode, item.tblSrc);
                    }, 100);
                });
            })
        },

        getDynamicColumns(pColumns, pModCode, pTblSrc) {
            var oColumns = pColumns;
            var modCode = pModCode;
            var tabName = pTblSrc;

            var oJSONColumnsModel = new JSONModel();
            var vSBU = this.getView().getModel("ui").getData().activeSbu;

            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            oModel.setHeaders({
                sbu: vSBU,
                type: modCode,
                tabname: tabName
            });
            
            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                    oJSONColumnsModel.setData(oData);

                    if (oData.results.length > 0) {
                        if (modCode === 'OUTDELHDRMOD') {
                            var aColumns = _this.setTableColumns(oColumns["outDelHdr"], oData.results);                          
                            _this._aColumns["outDelHdr"] = aColumns["columns"];
                            _this.addColumns(_this.byId("outDelHdrTab"), aColumns["columns"], "outDelHdr");
                        }
                        else if (modCode === 'OUTDELDTLMOD') {
                            var aColumns = _this.setTableColumns(oColumns["outDelDtl"], oData.results);                         
                            _this._aColumns["outDelDtl"] = aColumns["columns"];
                            _this.addColumns(_this.byId("outDelDtlTab"), aColumns["columns"], "outDelDtl");
                        }
                    }
                },
                error: function (err) {
                    _this.closeLoadingDialog();
                }
            });
        },
   
    });
   
  });