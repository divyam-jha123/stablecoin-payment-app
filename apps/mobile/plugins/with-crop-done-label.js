/* global require, module */
/* eslint-disable @typescript-eslint/no-require-imports -- Expo loads config plugins in Node. */
// Android builds only: the image picker's crop screen comes from the
// android-image-cropper library, whose confirm button reads "Crop". Override
// that string so it reads "Done". Has no effect in Expo Go or on iOS.
const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

module.exports = function withCropDoneLabel(config) {
  return withStringsXml(config, (mod) => {
    mod.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: 'crop_image_menu_crop', translatable: 'false' },
          _: 'Done',
        },
      ],
      mod.modResults,
    );
    return mod;
  });
};
