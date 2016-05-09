/**
 * Komponents framework
 * 
 * @author Fernando Gabrieli
 * @email fgabrieli at gmail dot com
 */

window.komp = {
    // component id, this is the tag name
    id : '',

    // component controller
    controller : {},

    init : function(component) {
        this.id = component;

        this.$componentEl = $(component);

        var controllerExpr = this.$componentEl.attr('controller');
        var controller = eval(controllerExpr);

        this.controller = controller;

        this.setupController();

        var t = this;
        $.when(this.setupTemplate()).then(function() {
            var rootScope = new komp.Scope(t.controller);
            t.compile(t.$componentEl, rootScope);
        })
    },

    compile : function($el, scope) {
        this.eval($el, scope);

        var t = this;
        $el.children().each(function(i, el) {
            t.compile($(el), scope);
        })
    },

    eval : function($el, scope) {
        var t = this;

        if (hasFor($el) && !isForCompiled($el)) {
            console.log('evaluating', $el, 'scope: ', scope);

            var newScope = new komp.Scope(scope);

            var expr = $el.attr('kfor');
            var parsedFor = expr.match(/(.*)\s+?in\s+?(.*)/);
            var indexName = parsedFor[1];
            var sourceName = parsedFor[2];
            var items = scope.getSymbol(sourceName);

            applyFor.call(this, indexName, items, $el, scope);

            return;
        }

        if (hasVariables($el)) {
            var html = elToHtml($el);
            var variables = html.match(/{(.*?)}/g);

            var replaced = false;

            for (var i = 0; i < variables.length; i++) {
                value = scope.getSymbol(variables[i].replace(/{|}/g, ''));
                if (value) {
                    html = html.replace(variables[i], value);
                    replaced = true;
                }
            }

            if (replaced)
                $el.replaceWith($(html));
        }

        function hasVariables($el) {
            var html = elToHtml($el);
            return /{.*}/.test(html);
        }

        function elToHtml($el) {
            return $('<div>').append($el.clone()).html();
        }

        function hasFor($el) {
            return $el[0].hasAttribute('kFor');
        }

        function isForCompiled($el) {
            return $el[0].hasAttribute('kFor-compiled');
        }

        function applyFor(indexName, items, $el, scope) {
            var newScope = new komp.Scope(scope);

            $el.attr('kFor-compiled', true);

            for (var i = 0; i < items.length; i++) {
                newScope.setSymbol(indexName, items[i]);

                var $newEl = $el.clone();
                $newEl.insertBefore($el);

                this.eval($newEl, newScope);
            }

            $el.remove();
        }
    },

    setupController : function() {
        var controller = this.controller;

        controller.getElement = function() {
            return $component;
        }

        controller.init();
    },

    /**
     * @returns promise
     */
    setupTemplate : function() {
        var d = $.Deferred();

        var controller = this.controller;

        if (controller.templateUrl) {
            $.when($.get(controller.templateUrl)).then(function(tpl) {
                setTemplate($(tpl));
                d.resolve();
            });
        } else {
            var $tpl = $(controller.template);
            $tpl.attr('component', this.id);

            setTemplate($tpl);
        }

        var t = this;

        function setTemplate($tpl) {
            t.$componentEl.html($tpl);

            d.resolve();
        }

        return d;
    },
}

komp.Scope = function(parentScope) {
    var symbols = {};

    this.setSymbol = function(symbol, value) {
        symbols[symbol] = value;
    },

    this.getSymbol = function(symbol) {
        if (symbols[symbol])
            return symbols[symbol];

        if (parentScope) {
            if (parentScope.getSymbol) {
                return parentScope.get(symbol);
            } else {
                return parentScope[symbol]; // root scope
            }
        }
    }
}