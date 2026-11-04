export default {
  customSyntax: 'postcss-html',
  rules: {
    'block-no-empty': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': [true, { ignore: ['consecutive-duplicates-with-different-values'] }],
    'property-no-unknown': true,
    'unit-no-unknown': true
  }
};
