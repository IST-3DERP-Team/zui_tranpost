sap.ui.define([

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
  ], function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
  
    "use strict";

    var _this;
    var _aTable = [];
    var _sSbu = "";

    var _sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
    var _sapDateTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd HH24:MI:SS" });
    var _sapTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:ss a"});
   
    return Controller.extend("zuitranpost.controller.BaseController", {

        onInitBase(pThis, pSbu) {
            _this = pThis;
            _sSbu = pSbu;
        },
   
        getColumns: async function(pTableList) {
            _aTable = pTableList;

            var oModelColumns = new JSONModel();
            var sPath = jQuery.sap.getModulePath("zuitranpost", "/model/columns.json")
            await oModelColumns.loadData(sPath);

            var oColumns = oModelColumns.getData();
            var oModel = this.getOwnerComponent().getModel();

            oModel.metadataLoaded().then(() => {
                pTableList.forEach(item => {
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, item);
                    }, 100);
                });
            })
        },

        getDynamicColumns(pColumn, pTable) {
            var oColumns = pColumn;
            var modCode = pTable.modCode;
            var tblSrc = pTable.tblSrc;
            var tblId = pTable.tblId;
            var tblModel = pTable.tblModel;

            var oJSONColumnsModel = new JSONModel();
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            oModel.setHeaders({
                sbu: _sSbu,
                type: modCode,
                tabname: tblSrc
            });
            
            oModel.read("/ColumnsSet", {
                success: function (oData, oResponse) {
                    oJSONColumnsModel.setData(oData);

                    if (oData.results.length > 0) {
                        var aColumns = _this.setTableColumns(oColumns[tblModel], oData.results);                          
                        _this._aColumns[tblModel] = aColumns["columns"];
                        _this.addColumns(_this.byId(tblId), aColumns["columns"], tblModel);
                    }
                },
                error: function (err) {
                    _this.closeLoadingDialog();
                }
            });
        },

        setTableColumns: function(pColumnLocal, pColumn) {
            var oColumnLocal = (pColumnLocal ? pColumnLocal : []);
            var oColumn = pColumn;
            
            var aColumns = [];

            oColumn.forEach((prop, idx) => {
                var vCreatable = prop.Creatable;
                var vUpdatable = prop.Editable;
                var vSortable = true;
                var vSorted = prop.Sorted;
                var vSortOrder = prop.SortOrder;
                var vFilterable = true;
                var vName = prop.ColumnLabel;
                var oColumnLocalProp = oColumnLocal.filter(col => col.name.toUpperCase() === prop.ColumnName);
                var vShowable = true;
                var vOrder = prop.Order;

                //columns
                aColumns.push({
                    name: prop.ColumnName, 
                    label: vName, 
                    position: +vOrder,
                    type: prop.DataType,
                    creatable: vCreatable,
                    updatable: vUpdatable,
                    sortable: vSortable,
                    filterable: vFilterable,
                    visible: prop.Visible,
                    required: prop.Mandatory,
                    width: prop.ColumnWidth + 'px',
                    sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                    hideOnChange: false,
                    valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                    showable: vShowable,
                    key: prop.Key === '' ? false : true,
                    maxLength: prop.Length,
                    precision: prop.Decimal,
                    scale: prop.Scale !== undefined ? prop.Scale : null
                })
            })

            aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
            var aColumnProp = aColumns.filter(item => item.showable === true);

            return { columns: aColumns };
        },

        addColumns(pTable, pColumn, pModel) {
            var aColumns = pColumn.filter(item => item.showable === true)
            aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

            aColumns.forEach(col => {
                // console.log(col)
                if (col.type === "STRING" || col.type === "DATETIME") {
                    pTable.addColumn(new sap.ui.table.Column({
                        id: pModel + "Col" + col.name,
                        width: col.width,
                        sortProperty: col.name,
                        filterProperty: col.name,
                        label: new sap.m.Text({text: col.label}),
                        template: new sap.m.Text({text: "{" + pModel + ">" + col.name + "}"}),
                        visible: col.visible
                    }));
                }
                else if (col.type === "NUMBER") {
                    pTable.addColumn(new sap.ui.table.Column({
                        id: pModel + "Col" + col.name,
                        width: col.width,
                        hAlign: "End",
                        sortProperty: col.name,
                        filterProperty: col.name,
                        label: new sap.m.Text({text: col.label}),
                        template: new sap.m.Text({text: "{" + pModel + ">" + col.name + "}"}),
                        visible: col.visible
                    }));
                }
                else if (col.type === "BOOLEAN" ) {
                    pTable.addColumn(new sap.ui.table.Column({
                        id: pModel + "Col" + col.name,
                        width: col.width,
                        hAlign: "Center",
                        sortProperty: col.name,
                        filterProperty: col.name,                            
                        label: new sap.m.Text({text: col.label}),
                        template: new sap.m.CheckBox({selected: "{" + pModel + ">" + col.name + "}", editable: false}),
                        visible: col.visible
                    }));
                }
            })
        },

        setRowReadMode(pModel) {
            var oTable = this.byId(pModel + "Tab");
            oTable.getColumns().forEach((col, idx) => {                    
                this._aColumns[pModel].filter(item => item.label === col.getLabel().getText())
                    .forEach(ci => {
                        if (ci.type === "STRING" || ci.type === "NUMBER") {
                            col.setTemplate(new sap.m.Text({
                                text: "{" + pModel + ">" + ci.name + "}",
                                wrapping: false,
                                tooltip: "{" + pModel + ">" + ci.name + "}"
                            }));
                        }
                        else if (ci.type === "BOOLEAN") {
                            col.setTemplate(new sap.m.CheckBox({selected: "{" + pModel + ">" + ci.name + "}", editable: false}));
                        }

                        if (ci.required) {
                            col.getLabel().removeStyleClass("requiredField");
                        }
                    })
            })
        },

        setRowEditMode(pModel) {
            console.log("setRowEditMode", pModel, this._aColumns[pModel])
            this.getView().getModel(pModel).getData().results.forEach(item => item.Edited = false);

            var oTable = this.byId(pModel + "Tab");

            oTable.getColumns().forEach((col, idx) => {
                this._aColumns[pModel].filter(item => item.label === col.getLabel().getText())
                    .forEach(ci => {
                        if (!ci.hideOnChange && ci.updatable) {
                            if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + pModel + ">" + ci.name + "}", editable: true}));
                            }
                            else if (ci.valueHelp["show"]) {
                                col.setTemplate(new sap.m.Input({
                                    // id: "ipt" + ci.name,
                                    type: "Text",
                                    value: "{" + pModel + ">" + ci.name + "}",
                                    maxLength: +ci.maxLength,
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                    suggestionItems: {
                                        path: ci.valueHelp["items"].path,
                                        length: 1000,
                                        template: new sap.ui.core.ListItem({
                                            key: "{" + ci.valueHelp["items"].value + "}",
                                            text: "{" + ci.valueHelp["items"].value + "}",
                                            additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                        }),
                                        templateShareable: false
                                    },
                                    change: this.onValueHelpLiveInputChange.bind(this)
                                }));
                            }
                            else if (ci.type === "NUMBER") {
                                col.setTemplate(new sap.m.Input({
                                    type: sap.m.InputType.Number,
                                    textAlign: sap.ui.core.TextAlign.Right,
                                    value: "{path:'" + pModel + ">" + ci.name + "', type:'sap.ui.model.odata.type.Decimal', formatOptions:{ minFractionDigits:" + ci.scale + ", maxFractionDigits:" + ci.scale + " }, constraints:{ precision:" + ci.precision + ", scale:" + ci.scale + " }}",
                                    liveChange: this.onNumberLiveChange.bind(this)
                                }));
                            }
                            else {
                                if (ci.maxLength !== null) {
                                    col.setTemplate(new sap.m.Input({
                                        value: "{" + pModel + ">" + ci.name + "}",
                                        maxLength: +ci.maxLength,
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }
                                else {
                                    col.setTemplate(new sap.m.Input({
                                        value: "{" + pModel + ">" + ci.name + "}",
                                        liveChange: this.onInputLiveChange.bind(this)
                                    }));
                                }
                            }                                
                        }

                        if (ci.required) {
                            col.getLabel().addStyleClass("requiredField");
                        }
                    })
            })
        },

        onFilterBySmart(pModel, pFilters, pFilterGlobal, pFilterTab) {
            var oFilter = null;
            var aFilter = [];
            var aFilterGrp = [];
            var aFilterCol = [];

            if (pFilters.length > 0 && pFilters[0].aFilters) {
                pFilters[0].aFilters.forEach(x => {
                    if (Object.keys(x).includes("aFilters")) {
                        
                        x.aFilters.forEach(y => {
                            console.log("aFilters", y, this._aColumns[pModel])
                            var sName = this._aColumns[pModel].filter(item => item.name.toUpperCase() == y.sPath.toUpperCase())[0].name;
                            aFilter.push(new Filter(sName, FilterOperator.Contains, y.oValue1));

                            //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                        });
                        var oFilterGrp = new Filter(aFilter, false);
                        aFilterGrp.push(oFilterGrp);
                        aFilter = [];
                    } else {
                        var sName = this._aColumns[pModel].filter(item => item.name.toUpperCase() == x.sPath.toUpperCase())[0].name;
                        aFilter.push(new Filter(sName, FilterOperator.Contains, x.oValue1));
                        var oFilterGrp = new Filter(aFilter, false);
                        aFilterGrp.push(oFilterGrp);
                        aFilter = [];

                        //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                    }
                });
            } else {
                var sName = pFilters[0].sPath;
                aFilter.push(new Filter(sName, FilterOperator.EQ,  pFilters[0].oValue1));
                var oFilterGrp = new Filter(aFilter, false);
                aFilterGrp.push(oFilterGrp);
                aFilter = [];
            }

            if (pFilterGlobal) {
                this._aColumns[pModel].forEach(item => {
                    var sDataType = this._aColumns[pModel].filter(col => col.name === item.name)[0].type;
                    if (sDataType === "Edm.Boolean") aFilter.push(new Filter(item.name, FilterOperator.EQ, pFilterGlobal));
                    else aFilter.push(new Filter(item.name, FilterOperator.Contains, pFilterGlobal));
                })

                var oFilterGrp = new Filter(aFilter, false);
                aFilterGrp.push(oFilterGrp);
                aFilter = [];
            }

            oFilter = new Filter(aFilterGrp, true);

            this.byId(pModel + "Tab").getBinding("rows").filter(oFilter, "Application");

            // Filter by Table columns
            _this.onFilterByCol(pModel, pFilterTab);
        },

        onFilterByCol(pModel, pFilterTab) {
            if (pFilterTab.length > 0) {
                pFilterTab.forEach(item => {
                    var iColIdx = _this._aColumns[pModel].findIndex(x => x.name == item.sPath);
                    _this.getView().byId(pModel + "Tab").filter(_this.getView().byId(pModel + "Tab").getColumns()[iColIdx], 
                        item.oValue1);
                });
            }
        },

        clearSortFilter(pTable) {
            var oTable = this.byId(pTable);
            var oColumns = oTable.getColumns();
            for (var i = 0, l = oColumns.length; i < l; i++) {

                if (oColumns[i].getFiltered()) {
                    oColumns[i].filter("");
                }

                if (oColumns[i].getSorted()) {
                    oColumns[i].setSorted(false);
                }
            }
        },
   
        showLoadingDialog(pTitle) {
            if (!_this._LoadingDialog) {
                _this._LoadingDialog = sap.ui.xmlfragment("zuitranpost.view.fragments.LoadingDialog", _this);
                _this.getView().addDependent(_this._LoadingDialog);
            } 
            
            _this._LoadingDialog.setTitle(pTitle);
            _this._LoadingDialog.open();
        },

        closeLoadingDialog() {
            _this._LoadingDialog.close();
        },

        formatDate(pDate) {
            return _sapDateFormat.format(pDate);
        }
    });
   
  });