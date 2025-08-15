/** @type {import('stylelint').Config} */
export default {
  extends: [
    "stylelint-config-standard"
  ],
  rules: {
    // Disable strict rules for development-friendly linting
    "selector-class-pattern": null,
    "selector-id-pattern": null,
    "keyframes-name-pattern": null,
    "custom-property-pattern": null,

    // Color and notation flexibility
    "alpha-value-notation": null,
    "color-function-notation": null,
    "color-function-alias-notation": null,
    "hue-degree-notation": null,

    // Font family quotes flexibility
    "font-family-name-quotes": null,

    // Spacing and formatting flexibility
    "comment-empty-line-before": null,
    "declaration-empty-line-before": null,
    "rule-empty-line-before": null,
    "declaration-block-single-line-max-declarations": null,

    // Reasonable limits
    "selector-max-id": 3,
    "selector-max-class": 6,
    "selector-max-compound-selectors": 6,
    "max-nesting-depth": 4,

    // Modern CSS and framework compatibility
    "no-descending-specificity": null,
    "property-no-vendor-prefix": null,
    "value-no-vendor-prefix": null,
    "selector-not-notation": null,
    "selector-pseudo-element-colon-notation": null,

    // Media queries
    "media-feature-range-notation": null,

    // Allow unknown pseudo-classes for frameworks
    "selector-pseudo-class-no-unknown": [
      true,
      {
        "ignorePseudoClasses": ["global", "local"]
      }
    ],

    // Allow unknown at-rules for modern CSS
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": [
          "supports",
          "layer",
          "container",
          "media"
        ]
      }
    ]
  },
  ignoreFiles: [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**"
  ]
};
