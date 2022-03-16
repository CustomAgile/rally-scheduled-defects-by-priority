Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    category_field: 'Priority',
    logger: new Rally.technicalservices.logger(),
    items: [
        {xtype:'container',itemId:'selector_box',margin: 5, layout:{type:'hbox'}},
        {xtype:'container',itemId:'chart_box', padding: 5},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#selector_box').add({
            xtype:'rallyreleasecombobox',
            itemId:'releasebox',
            listeners: {
                scope: this,
                change: function(rb, new_value, old_value) {
                    this._getDefects();
                },
                ready: function(rb) {
                    this._getDefects();
                }
            }
        });    
    },
    _getDefects: function() {
        this.logger.log(this,'_getDefects');
        this.down('#chart_box').removeAll();
        
        var release = this.down('#releasebox').getRecord();
        var me = this;
        
        var release_filter  = Ext.create('Rally.data.QueryFilter', {property:'Release.Name',value:release.get('Name')});
        var estimate_filter = Ext.create('Rally.data.QueryFilter', {property:'PlanEstimate',operator:'>',value:0});
        
        var state_filter = Ext.create('Rally.data.QueryFilter',{property:'State',value:'Open'}).or(
            Ext.create('Rally.data.QueryFilter',{property:'State',value:'Submitted'})
        );
        
        var filters = release_filter.and(estimate_filter.and(state_filter));
                                    
        Ext.create('Rally.data.WsapiDataStore',{
            autoLoad: true,
            model:'Defect',
            filters: filters,
            fetch:[me.category_field,'PlanEstimate'],
            limit:'Infinity',
            listeners: {
                scope: this,
                load: function(store,defects){
                    this._getValidCategories(defects);
                }
            }
        });
    },
    _getValidCategories: function(defects){
        this.logger.log(this,'_getValidPriorities',defects);
        var me = this;
        var categories = {};
        
        Rally.data.ModelFactory.getModel({
            type: 'Defect',
            success: function(model){
                var field = model.getField(me.category_field);
                me.logger.log(this,field);
                field.getAllowedValueStore().load({
                    callback: function(values,operation,success){
                        Ext.Array.each(values,function(value){
                            console.log(value);
                            var value_string = value.get('StringValue');
                            if ( value_string === '' ) {
                                value_string = 'None';
                            }
                            categories[value_string] = 0;
                        });
                        me._processDefectsWithCategories(defects,categories);
                    }
                });
            }
        });
    },
    _processDefectsWithCategories: function(defects,categories){
        var me = this;
        this.logger.log(this,"_processDefectsWithCategories");
        Ext.Array.each( defects,function(defect){
            var plan_estimate = defect.get('PlanEstimate');
            var category = defect.get(me.category_field);
            if ( categories[category] !== undefined ) {
                categories[category] += plan_estimate;
            } else {
                me.logger.log(this,"Not familiar with the", me.category_field, category);
            }
        });
        this._makeChart(categories);
    },
    _makeChart: function(categories) {
        this.logger.log(this,categories);
        var me = this;
        
        var category_names =[];
        var values = [];
        
        Ext.Object.each(categories,function(name,value){
            values.push(value);
            category_names.push(name);
        });
        
        this.down('#chart_box').add({
            xtype:'rallychart',
            chartData: {
                categories: category_names,
                series: [{
                    type: 'column',
                    data: values,
                    visible: true,
                    name: 'Total Planned US Pts'
                }]
            },
            chartConfig: {
                chart: {
                    height: me.getHeight() - 75
                },
                title: {
                    text: 'Defect Status',
                    align: 'center'
                },
                xAxis: [{
                    categories: category_names,
                    minorTickInterval: null,
                    tickLength: 0
                }],
                yAxis: [{
                    title: {
                        enabled: true,
                        text: 'Story Points'
                    }
                }]
            }
        });
    }
});