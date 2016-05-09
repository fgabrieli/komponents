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
            var compiler = new komp.Compiler();
            var rootScope = new komp.Scope(t.controller);
            compiler.compile(t.$componentEl, rootScope);
        })
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
    var scope = function() {
    }

    scope.prototype = Object.create(parentScope);

    return new scope();
}

komp.Compiler = function() {
    this.compile = function($el, scope) {
        this.eval($el, scope);

        var t = this;
        $el.children().each(function(i, el) {
            t.compile($(el), scope);
        })
    }

    this.eval = function($el, scope) {
        var t = this;

        // console.log('evaluating', $el.html(), 'scope: ', scope);

        if (hasFor($el) && !isForCompiled($el)) {

            var newScope = new komp.Scope(scope);

            var expr = $el.attr('kfor');
            var parsedFor = expr.match(/(.*)\s+?in\s+?(.*)/);
            var indexName = parsedFor[1];
            var sourceName = parsedFor[2];
            var items = scope[sourceName];

            applyFor.call(this, indexName, items, $el, scope);
        }

        if (hasVariables($el)) {
            $el = setVariables($el, scope);
        }

        if (hasIf($el)) {
            var condition = $el.attr('kIf');
            
            var parts = condition.match(/(.*?)\s+?([=|<|>|!|>=|<=|]+)\s+?(.*)/);
            if (parts == null) {
                evalProposition(condition);
            } else {
                var conditionType = parts[2];
                
                evalProposition(parts[1]);
                
                evalProposition(parts[3]);
            }

            function evalProposition(prop) {
                if (!isLiteral(prop)) {
                    condition = condition.replace(prop, 'this.' + prop);
                }
                
                if (isFunction(prop)) {
                    var params = prop.match(/(.*)\((.*)+\)$/)[2].split(',');
                    for (var i = 0; i < params.length; i++) {
                        var param = params[i];
                        condition = condition.replace(param, 'this.' + param);
                    }
                }
            }

            function isFunction(prop) {
                return /(.*)\((.*)+\)$/.test(prop);
            }

            var result = jsEval(condition, scope);

            console.log(condition);

            if (result === false) {
                $el.css('display', 'none');
            }
        }
    }

    function isLiteral(expr) {
        try {
            var evaled = eval(expr);

            return (typeof evaled).indexOf['object', 'function'] != -1;
        } catch (e) {
            return false;
        }
    }

    function jsEval(expr, scope) {
        return function(expr) {
            return eval(expr);
        }.call(scope, expr);
    }

    function setVariables($el, scope) {
        var html = elToHtml($el);
        var variables = html.match(/{(.*?)}/g);

        var replaced = false;

        for (var i = 0; i < variables.length; i++) {
            var symbol = variables[i];
            value = scope[symbol.replace(/{|}/g, '')];
            if (value) {
                html = html.replace(variables[i], value);
                replaced = true;
            }
        }

        var $newElement = false;
        if (replaced) {
            $newElement = $(html).replaceAll($el);
        }

        return $newElement ? $newElement : $el;
    }

    function hasIf($el) {
        return $el[0].hasAttribute('kIf');
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
            newScope[indexName] = items[i];

            var $newEl = $el.clone();

            this.eval($newEl, newScope);

            var t = this;
            $newEl.children().each(function(i, childEl) {
                t.eval($(childEl), newScope);
            })
            
            console.log(elToHtml($newEl));
            
            $newEl.insertBefore($el);

        }

        $el.remove();
    }

}