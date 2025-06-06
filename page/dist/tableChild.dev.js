"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 *
 * @name:  子表格扩展
 * @author: yelog
 * @version: v1.5.8
 */
layui.define(['table', 'element', 'form', 'laytpl'], function (exports) {
  var $ = layui.jquery,
      table = layui.table,
      laytpl = layui.laytpl,
      tableChildren = {},
      ELEM_HOVER = 'soul-table-hover'; // 封装方法

  var mod = {
    /**
     * 渲染入口
     * @param myTable
     */
    render: function render(myTable) {
      var _this = this,
          $table = $(myTable.elem),
          $tableBox = $table.next().children('.layui-table-box'),
          tableId = myTable.id,
          $tableHead = $tableBox.children('.layui-table-header').children('table'),
          $fixedBody = $tableBox.children('.layui-table-fixed').children('.layui-table-body').children('table'),
          $noFixedBody = $tableBox.children('.layui-table-body').children('table'),
          $tableBody = $.merge($tableBox.children('.layui-table-body').children('table'), $fixedBody),
          columns = _this.getCompleteCols(myTable.cols),
          childIndex = [],
          soulSort = typeof myTable.soulSort === 'undefined' || myTable.soulSort,
          i; // 修复hover样式


      _this.fixHoverStyle(myTable); // 获取子表配置信息


      for (i = 0; i < columns.length; i++) {
        if (columns[i].children && columns[i].children.length > 0) {
          childIndex.push(i);
        }
      }

      if (typeof $table.attr('lay-filter') === 'undefined') {
        $table.attr('lay-filter', tableId);
      } // 绑定一下主表事件


      if ($table.parents('.childTr').length === 0) {
        if (typeof myTable.rowEvent === 'function') {
          table.on('row(' + $table.attr('lay-filter') + ')', function (obj) {
            var index = $(this).data('index');
            obj.tr = $tableBody.children('tbody').children('tr[data-index="' + index + '"]');
            myTable.rowEvent(obj);
          });
        }

        if (typeof myTable.rowDoubleEvent === 'function') {
          table.on('rowDouble(' + $table.attr('lay-filter') + ')', function (obj) {
            var index = $(this).data('index');
            obj.tr = $tableBody.children('tbody').children('tr[data-index="' + index + '"]');
            myTable.rowDoubleEvent(obj);
          });
        }
      }

      if (childIndex.length > 0) {
        for (i = 0; i < childIndex.length; i++) {
          (function f() {
            var child = columns[childIndex[i]],
                curIndex = childIndex[i],
                icon = child.icon || ['layui-icon layui-icon-right', 'layui-icon layui-icon-down'];

            if (soulSort && !(myTable.url && myTable.page)) {
              // 前台排序
              table.on('sort(' + $table.attr('lay-filter') + ')', function () {
                _this.render(myTable);
              });
            }

            if (child.isChild && typeof child.isChild === 'function') {
              $tableBody.find('tr').find('td[data-key$="' + child.key + '"]>div').each(function (index) {
                if (child.isChild(layui.table.cache[tableId][index])) {
                  if (child.field) {
                    $(this).prepend('<i style="cursor: pointer" class="childTable ' + icon[0] + '"></i>');
                  } else {
                    $(this).html('<i style="cursor: pointer" class="childTable ' + icon[0] + '"></i>');
                  }
                }
              });
            } else {
              if (child.field) {
                $tableBody.find('tr').find('td[data-key$="' + child.key + '"]>div').prepend('<i style="cursor: pointer" class="childTable ' + icon[0] + '"></i>');
              } else {
                $tableBody.find('tr').find('td[data-key$="' + child.key + '"]>div').html('<i style="cursor: pointer" class="childTable ' + icon[0] + '"></i>');
              }
            }

            $tableBody.children('tbody').children('tr').each(function () {
              $(this).children('td:eq(' + curIndex + ')').find('.childTable').on('click', function (e) {
                layui.stope(e);
                var rowIndex = $(this).parents('tr:eq(0)').data('index'),
                    key = $(this).parents('td:eq(0)').data('key'),
                    $this = $noFixedBody.children('tbody').children('tr[data-index=' + rowIndex + ']').children('td[data-key="' + key + '"]').find('.childTable:eq(0)'),
                    $fixedThis = $fixedBody.find('tr[data-index=' + rowIndex + ']').children('td[data-key="' + key + '"]').find('.childTable:eq(0)'),
                    data = table.cache[myTable.id][rowIndex],
                    children = child.children;

                if (typeof child.children === 'function') {
                  children = child.children(data);
                }

                if (child.show === 2) {
                  // 弹窗模式
                  child.layerOption ? typeof child.layerOption.title === 'function' ? child.layerOption.title = child.layerOption.title(data) : null : null;
                  layer.open($.extend({
                    type: 1,
                    title: '子表',
                    maxmin: true,
                    content: _this.getTables(this, data, child, myTable, children),
                    area: '1000px',
                    offset: '100px'
                  }, child.layerOption || {}));

                  _this.renderTable(this, data, child, myTable, children, icon);
                } else {
                  // 展开模式
                  // 开启手风琴模式
                  if (!$this.hasClass(icon[1]) && child.collapse) {
                    $tableBody.children('tbody').children('tr').children('td').find('.childTable').each(function () {
                      if ($(this).hasClass(icon[1])) {
                        _this.destroyChildren($(this).parents('tr:eq(0)').data('index'), myTable, icon);
                      }
                    });
                  } // 多个入口时，关闭其他入口


                  if (!$this.hasClass(icon[1])) {
                    $this.parents('tr:eq(0)').children('td').find('.childTable').each(function () {
                      if ($(this).hasClass(icon[1])) {
                        $(this).removeClass(icon[1]).addClass(icon[0]);

                        _this.destroyChildren($(this).parents('tr:eq(0)').data('index'), myTable, icon);
                      }
                    });
                  }

                  if ($this.hasClass(icon[1])) {
                    $this.removeClass(icon[1]).addClass(icon[0]);
                    $fixedThis.removeClass(icon[1]).addClass(icon[0]);
                  } else {
                    $this.removeClass(icon[0]).addClass(icon[1]);
                    $fixedThis.removeClass(icon[0]).addClass(icon[1]);
                  }

                  var rowspanIndex = $this.parents('td:eq(0)').attr("rowspan");

                  if ($this.hasClass(icon[1])) {
                    var newTr = [];
                    newTr.push('<tr class="noHover childTr"><td colspan="' + $tableHead.find('th:visible').length + '"  style="cursor: inherit; padding: 0; width: ' + $this.parents('tr:eq(0)').width() + 'px">');
                    newTr.push(_this.getTables(this, data, child, myTable, children));
                    newTr.push('</td></tr>');

                    if (rowspanIndex) {
                      var index = parseInt($this.parents('tr:eq(0)').data("index")) + parseInt(rowspanIndex) - 1;
                      $this.parents('table:eq(0)').children().children("[data-index='" + index + "']").after(newTr.join(''));
                    } else {
                      $this.parents('tr:eq(0)').after(newTr.join(''));
                    }

                    _this.renderTable(this, data, child, myTable, children, icon);

                    if ($fixedBody.length > 0) {
                      var $tr = $this.parents('tr:eq(0)').next(),
                          height = $tr.children('td').height(),
                          $patchDiv = '<div class="soul-table-child-patch" style="height: ' + height + 'px"></div>';
                      $tr.children('td').children('.layui-tab-card').css({
                        position: 'absolute',
                        top: 0,
                        width: '100%',
                        background: 'white',
                        'z-index': 200
                      });
                      $tr.children('td').append($patchDiv);
                      $fixedBody.find('tr[data-index="' + rowIndex + '"]').each(function () {
                        $(this).after('<tr><td style="padding: 0;" colspan="' + $(this).children('[data-key]').length + '">' + $patchDiv + '</td></tr>');
                      });
                      table.resize(tableId);
                    }

                    if (child.show === 3) {
                      $this.parents('tr:eq(0)').next().find('.layui-table-view').css({
                        margin: 0,
                        'border-width': 0
                      });
                      $this.parents('tr:eq(0)').next().find('.layui-table-header').css('display', 'none');
                    } // 阻止事件冒泡


                    $this.parents('tr:eq(0)').next().children('td').children('.layui-tab').children('.layui-tab-content').on('click', function (e) {
                      e.stopPropagation();
                    }).off('dblclick').on('dblclick', function (e) {
                      e.stopPropagation();
                    }).on('mouseenter', 'td', function (e) {
                      e.stopPropagation();
                    }).on('change', function (e) {
                      layui.stope(e);
                    });
                  } else {
                    _this.destroyChildren(rowIndex, myTable, icon);

                    table.resize(tableId);
                  }
                }
              });
            });

            if (child.spread && child.show !== 2) {
              $tableBody.children('tbody').children('tr').children('td').find('.childTable').trigger('click');
            }
          })();
        }
      }
    },

    /**
     * 生成子表内容
     * @param _this
     * @param data
     * @param child
     * @param myTable
     * @param children 子表配置
     * @returns {string}
     */
    getTables: function getTables(_this, data, child, myTable, children) {
      var tables = [],
          $table = $(myTable.elem),
          tableId = myTable.id,
          rowTableId = tableId + $(_this).parents('tr:eq(0)').data('index'),
          $tableMain = $table.next().children('.layui-table-box').children('.layui-table-body'),
          $tableBody = $tableMain.children('table'),
          scrollWidth = 0,
          i;
      tables.push('<div class="layui-tab layui-tab-card" lay-filter="table-child-' + rowTableId + '" style="margin: 0;border: 0;box-shadow: none;');

      if (child.show === 2) {
        tables.push('max-width: ' + ($tableBody.width() - 2) + 'px">');
      } else if (child.show === 3) {
        //不限制宽度
        tables.push('">');
      } else {
        if (child.childWidth === 'full') {
          //不限制宽度
          tables.push('">');
        } else {
          if ($tableMain.prop('scrollHeight') + (children.length > 0 ? children[0].height : 0) > $tableMain.height()) {
            scrollWidth = this.getScrollWidth();
          }

          tables.push('max-width: ' + ($tableMain.width() - 1 - scrollWidth) + 'px">');
        }
      }

      if (child.show !== 3 && (typeof child.childTitle === 'undefined' || child.childTitle)) {
        tables.push('<ul class="layui-tab-title">');

        for (i = 0; i < children.length; i++) {
          tables.push('<li class="' + (i === 0 ? 'layui-this' : '') + '">' + (typeof children[i].title === 'function' ? children[i].title(data) : children[i].title) + '</li>');
        }

        tables.push('</ul>');
      }

      if (child.show === 3) {
        tables.push('<div class="layui-tab-content" style="padding: 0">');
      } else {
        tables.push('<div class="layui-tab-content" style="padding: 0 10px">');
      }

      for (i = 0; i < children.length; i++) {
        var childTableId = rowTableId + i;
        tables.push('<div class="layui-tab-item layui-show"><form action="" class="layui-form" ><table id="' + childTableId + '" lay-filter="' + childTableId + '"></table></form></div>');
      }

      tables.push('</div></div>');
      return tables.join('');
    },

    /**
     * 渲染子表
     * @param _this
     * @param data 父表当前行数据
     * @param child 子表列
     * @param myTable 父表配置
     * @param children 子表配置
     * @param icon 自定义图标
     */
    renderTable: function renderTable(_this, data, child, myTable, children, icon) {
      var tables = [],
          _that = this,
          tableId = myTable.id,
          rowTableId = tableId + $(_this).parents('tr:eq(0)').data('index');

      if (child.lazy) {
        tables.push(renderChildTable(_that, _this, data, child, myTable, 0, children, icon));
      } else {
        for (var i = 0; i < children.length; i++) {
          tables.push(renderChildTable(_that, _this, data, child, myTable, i, children, icon));
        }
      }

      tableChildren[rowTableId] = tables;
      layui.element.on('tab(table-child-' + rowTableId + ')', function (tabData) {
        if (child.lazy) {
          var isRender = false; // 是否已经渲染

          for (i = 0; i < tableChildren[rowTableId].length; i++) {
            if (tableChildren[rowTableId][i].config.id === rowTableId + tabData.index) {
              isRender = true;
              break;
            }
          }

          if (!isRender) {
            tableChildren[rowTableId].push(renderChildTable(_that, _this, data, child, myTable, tabData.index, children));
          }
        }

        var rowIndex = $(_this).parents('tr:eq(0)').data('index'),
            height = $(tabData.elem).height();
        $(_this).parents('.layui-table-box:eq(0)').children('.layui-table-body').children('table').children('tbody').children('tr[data-index=' + rowIndex + ']').next().children().children('.soul-table-child-patch').css('height', height);
        $(_this).parents('.layui-table-box:eq(0)').children('.layui-table-fixed').children('.layui-table-body').children('table').children('tbody').children('tr[data-index=' + rowIndex + ']').next().children().children('.soul-table-child-patch').css('height', height);
        table.resize(tableId);
      });

      function renderChildTable(_that, _this, data, child, myTable, i, children, icon) {
        var param = _that.deepClone(children[i]),
            thisTableChild,
            tableId = myTable.id,
            rowIndex = $(_this).parents('tr:eq(0)').data('index'),
            childTableId = tableId + rowIndex + i,
            $table = $(myTable.elem),
            $tableBox = $table.next().children('.layui-table-box'),
            $tableBody = $.merge($tableBox.children('.layui-table-body').children('table'), $tableBox.children('.layui-table-fixed').children('.layui-table-body').children('table')),
            tr = $tableBody.children('tbody').children('tr[data-index="' + rowIndex + '"]'),
            row = table.cache[tableId][rowIndex],
            // 父表当前行对象
        pobj = {
          data: row,
          tr: tr,
          del: function del() {
            table.cache[tableId][rowIndex] = [];

            _that.destroyChildren(rowIndex, myTable, icon);

            tr.remove();
            table.resize(tableId);
          },
          update: function update(fields) {
            fields = fields || {};
            layui.each(fields, function (key, value) {
              if (key in row) {
                var templet,
                    td = tr.children('td[data-field="' + key + '"]');
                row[key] = value;
                table.eachCols(tableId, function (i, item2) {
                  if (item2.field == key && item2.templet) {
                    templet = item2.templet;
                  }
                });
                td.children('.layui-table-cell').html(function () {
                  return templet ? function () {
                    return typeof templet === 'function' ? templet(row) : laytpl($(templet).html() || value).render(row);
                  }() : value;
                }());
                td.data('content', value);
              }
            });
          },
          close: function close() {
            _that.destroyChildren(rowIndex, myTable, icon);

            table.resize(tableId);
          }
        };

        param.id = childTableId;
        param.elem = '#' + childTableId;
        typeof param.where === 'function' && (param.where = param.where(data));
        typeof param.data === 'function' && (param.data = param.data(data));
        typeof param.url === 'function' && (param.url = param.url(data));
        thisTableChild = table.render(param);

        if (!child.lazy && i !== 0) {
          $('#' + childTableId).parents('.layui-tab-item:eq(0)').removeClass('layui-show'); //解决隐藏时计算表格高度有问题
        } // 绑定 checkbox 事件


        if (typeof param.checkboxEvent === 'function') {
          table.on('checkbox(' + childTableId + ')', function (obj) {
            param.checkboxEvent(obj, pobj);
          });
        } // 绑定 edit 事件


        if (typeof param.editEvent === 'function') {
          table.on('edit(' + childTableId + ')', function (obj) {
            obj.oldValue = $(this).prev().text();
            param.editEvent(obj, pobj);
          });
        } // 绑定 tool 事件


        if (typeof param.toolEvent === 'function') {
          table.on('tool(' + childTableId + ')', function (obj) {
            param.toolEvent(obj, pobj);
          });
        } // 绑定 toolbar 事件


        if (typeof param.toolbarEvent === 'function') {
          table.on('toolbar(' + childTableId + ')', function (obj) {
            param.toolbarEvent(obj, pobj);
          });
        } // 绑定单击行事件


        if (typeof param.rowEvent === 'function') {
          table.on('row(' + childTableId + ')', function (obj) {
            param.rowEvent(obj, pobj);
          });
        } // 绑定双击行事件


        if (typeof param.rowDoubleEvent === 'function') {
          table.on('rowDouble(' + childTableId + ')', function (obj) {
            param.rowDoubleEvent(obj, pobj);
          });
        }

        return thisTableChild;
      }
    },
    destroyChildren: function destroyChildren(rowIndex, myTable, icon) {
      var tableId = myTable.id,
          $table = $(myTable.elem),
          $tableBox = $table.next().children('.layui-table-box'),
          $fixedBody = $tableBox.children('.layui-table-fixed').children('.layui-table-body').children('table'),
          $tableBody = $.merge($tableBox.children('.layui-table-body').children('table'), $fixedBody),
          $tr = $tableBody.children('tbody').children('tr[data-index="' + rowIndex + '"]');
      $tr.find('.childTable').removeClass(icon[1]).addClass(icon[0]); // 暂时不处理 rowspan 情况
      // var rowspanIndex = $this.parents('td:eq(0)').attr("rowspan");
      // if(rowspanIndex){
      //     var index=$this.parents('tr:eq(0)').index()+parseInt(rowspanIndex);
      //     $this.parents('table:eq(0)').children().children('tr:eq('+index+')').remove()
      // }else{
      //     $this.parents('tr:eq(0)').next().remove();
      // }

      $tr.next().remove();
      var tables = tableChildren[tableId + rowIndex];

      if (layui.tableFilter) {
        //如果使用了筛选功能，怎同时清理筛选渲染的数据
        layui.tableFilter.destroy(tables);
      }

      delete tableChildren[tableId + rowIndex];
    },
    cloneJSON: function cloneJSON(obj) {
      var JSON_SERIALIZE_FIX = {
        PREFIX: "[[JSON_FUN_PREFIX_",
        SUFFIX: "_JSON_FUN_SUFFIX]]"
      };
      var sobj = JSON.stringify(obj, function (key, value) {
        if (typeof value === 'function') {
          return JSON_SERIALIZE_FIX.PREFIX + value.toString() + JSON_SERIALIZE_FIX.SUFFIX;
        }

        return value;
      });
      return JSON.parse(sobj, function (key, value) {
        if (typeof value === 'string' && value.indexOf(JSON_SERIALIZE_FIX.SUFFIX) > 0 && value.indexOf(JSON_SERIALIZE_FIX.PREFIX) === 0) {
          return eval("(" + value.replace(JSON_SERIALIZE_FIX.PREFIX, "").replace(JSON_SERIALIZE_FIX.SUFFIX, "") + ")");
        }

        return value;
      }) || {};
    },
    fixHoverStyle: function fixHoverStyle(myTable) {
      var $table = $(myTable.elem),
          $tableBody = $table.next().children('.layui-table-box').children('.layui-table-body').children('table'),
          $tableFixed = $table.next().children('.layui-table-box').children('.layui-table-fixed').children('.layui-table-body').children('table'),
          style = $table.next().find('style')[0],
          sheet = style.sheet || style.styleSheet || {}; // 屏蔽掉layui原生 hover 样式

      this.addCSSRule(sheet, '.layui-table-hover', 'background-color: inherit');
      this.addCSSRule(sheet, '.layui-table-hover.soul-table-hover', 'background-color: #F2F2F2');
      $.merge($tableFixed.children('tbody').children('tr'), $tableBody.children('tbody').children('tr')).on('mouseenter', function () {
        var othis = $(this),
            index = $(this).data('index');
        if (othis.data('off')) return;
        $tableFixed.children('tbody').children('tr[data-index=' + index + ']').addClass(ELEM_HOVER);
        $tableBody.children('tbody').children('tr[data-index=' + index + ']').addClass(ELEM_HOVER);
      }).on('mouseleave', function () {
        var othis = $(this),
            index = $(this).data('index');
        if (othis.data('off')) return;
        $tableFixed.children('tbody').children('tr[data-index=' + index + ']').removeClass(ELEM_HOVER);
        $tableBody.children('tbody').children('tr[data-index=' + index + ']').removeClass(ELEM_HOVER);
      });
    },
    addCSSRule: function addCSSRule(sheet, selector, rules, index) {
      if ('insertRule' in sheet) {
        sheet.insertRule(selector + '{' + rules + '}', index);
      } else if ('addRule' in sheet) {
        sheet.addRule(selector, rules, index);
      }
    },
    // 深度克隆-不丢失方法
    deepClone: function deepClone(obj) {
      var newObj = Array.isArray(obj) ? [] : {};

      if (obj && _typeof(obj) === "object") {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            newObj[key] = obj && _typeof(obj[key]) === 'object' ? this.deepClone(obj[key]) : obj[key];
          }
        }
      }

      return newObj;
    },
    getCompleteCols: function getCompleteCols(origin) {
      var cols = this.deepClone(origin);
      var i, j, k, cloneCol;

      for (i = 0; i < cols.length; i++) {
        for (j = 0; j < cols[i].length; j++) {
          if (!cols[i][j].exportHandled) {
            if (cols[i][j].rowspan > 1) {
              cloneCol = this.deepClone(cols[i][j]);
              cloneCol.exportHandled = true;
              k = i + 1;

              while (k < cols.length) {
                cols[k].splice(j, 0, cloneCol);
                k++;
              }
            }

            if (cols[i][j].colspan > 1) {
              cloneCol = this.deepClone(cols[i][j]);
              cloneCol.exportHandled = true;

              for (k = 1; k < cols[i][j].colspan; k++) {
                cols[i].splice(j, 0, cloneCol);
              }

              j = j + cols[i][j].colspan - 1;
            }
          }
        }
      }

      return cols[cols.length - 1];
    },
    getScrollWidth: function getScrollWidth(elem) {
      var width = 0;

      if (elem) {
        width = elem.offsetWidth - elem.clientWidth;
      } else {
        elem = document.createElement('div');
        elem.style.width = '100px';
        elem.style.height = '100px';
        elem.style.overflowY = 'scroll';
        document.body.appendChild(elem);
        width = elem.offsetWidth - elem.clientWidth;
        document.body.removeChild(elem);
      }

      return width;
    }
  }; // 输出

  exports('tableChild', mod);
});