with (this) {
  return _c("div", { staticClass: "shop_car" }, [
    _c("div", { staticClass: "car" }, [
      _c("p", [
        _c("img", {
          attrs: { src: "/dist/imgs/ic_shopping_cart.svg", alt: "" }
        }),
        _v(" "),
        _c("span", [_v(_s(sale_count))])
      ]),
      _v(" "),
      _c("span")
    ]),
    _v(" "),
    _c("div", { staticClass: "money" }, [
      _c("span", [_v("￥" + _s(sale))]),
      _v(" "),
      _c("span", { pre: true }, [_v("code")]),
      _v(" "),
      _c("span", { on: { click: add_goods } }, [_v("加入购物车")])
    ])
  ]);
}

with (this) {
  return _c(
    "div",
    { attrs: { id: "app" } },
    [
      _c("my-checkbox", {
        attrs: { value: "some value" },
        model: {
          value: foo,
          callback: function($$v) {
            foo = $$v;
          },
          expression: "foo"
        }
      })
    ],
    1
  );
}

with (this) {
  return _c(
    "div",
    { attrs: { id: "app" } },
    [
      _c("my-checkbox", {
        attrs: { value: "some value" },
        model: {
          value: foo,
          callback: function($$v) {
            foo = $$v;
          },
          expression: "foo"
        }
      }),
      _v(" "),
      [_c("h1", [_v("hh")])]
    ],
    2
  );
}

with (this) {
  return _c(
    "div",
    { attrs: { id: "app" } },
    _l(object, function(value, key, index) {
      return _c("p", [_v(_s(index) + ". " + _s(key) + " : " + _s(value))]);
    })
  );
}

with (this) {
  return _c("div", { attrs: { id: "app" } }, [
    value == 1
      ? _c("p", [_v("v-if块的内容")])
      : value == 2
        ? _c("p", [_v("v-else-if块的内容")])
        : _c("p", [_v("v-else块的内容")])
  ]);
}

with (this) {
  return _c(
    "section",
    {
      directives: [
        {
          name: "show",
          rawName: "v-show",
          value: sortBy == "food",
          expression: "sortBy == 'food'"
        }
      ],
      staticClass: "category_container sort_detail_type"
    },
    [
      _c("section", { staticClass: "category_left" }, [
        _c(
          "ul",
          _l(category, function(item, index) {
            return _c(
              "li",
              {
                key: index,
                staticClass: "category_left_li",
                class: { category_active: restaurant_category_id == item.id },
                on: {
                  click: function($event) {
                    selectCategoryName(item.id, index);
                  }
                }
              },
              [
                _c("section", [
                  index
                    ? _c("img", {
                        staticClass: "category_icon",
                        attrs: { src: getImgPath(item.image_url) }
                      })
                    : _e(),
                  _v(" "),
                  _c("span", [_v(_s(item.name))])
                ]),
                _v(" "),
                _c("section", [
                  _c("span", { staticClass: "category_count" }, [
                    _v(_s(item.count))
                  ]),
                  _v(" "),
                  index
                    ? _c(
                        "svg",
                        {
                          staticClass: "category_arrow",
                          attrs: {
                            width: "8",
                            height: "8",
                            xmlns: "http://www.w3.org/2000/svg",
                            version: "1.1"
                          }
                        },
                        [
                          _c("path", {
                            attrs: {
                              d: "M0 0 L6 4 L0 8",
                              stroke: "#bbb",
                              "stroke-width": "1",
                              fill: "none"
                            }
                          })
                        ]
                      )
                    : _e()
                ])
              ]
            );
          })
        )
      ]),
      _v(" "),
      _c("section", { staticClass: "category_right" }, [
        _c(
          "ul",
          _l(categoryDetail, function(item, index) {
            return index
              ? _c(
                  "li",
                  {
                    key: index,
                    staticClass: "category_right_li",
                    class: {
                      category_right_choosed:
                        restaurant_category_ids == item.id ||
                        (!restaurant_category_ids && index == 0)
                    },
                    on: {
                      click: function($event) {
                        getCategoryIds(item.id, item.name);
                      }
                    }
                  },
                  [
                    _c("span", [_v(_s(item.name))]),
                    _v(" "),
                    _c("span", [_v(_s(item.count))])
                  ]
                )
              : _e();
          })
        )
      ])
    ]
  );
}
