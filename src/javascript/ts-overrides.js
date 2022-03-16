/*
 * Fixes rc1 eternal sparkler
 * 
 */
Ext.override(Rally.ui.chart.Chart,{
    onRender: function () {
        this.callParent(arguments);
        this._unmask();
    }
});