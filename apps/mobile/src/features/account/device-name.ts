import { Platform } from 'react-native';

function titleCase(value: string) {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/** This phone's model and OS, such as "Google Pixel 8" and "Android 15". */
export function thisDevice() {
  if (Platform.OS === 'android') {
    const { Brand, Model, Release } = Platform.constants;
    const brand = titleCase(Brand ?? '');
    const model = Model ?? 'Android phone';
    return {
      name: model.toLowerCase().startsWith(brand.toLowerCase())
        ? model
        : `${brand} ${model}`.trim(),
      detail: `Android ${Release}`,
    };
  }
  if (Platform.OS === 'ios')
    return {
      name: Platform.isPad ? 'iPad' : 'iPhone',
      detail: `iOS ${Platform.Version}`,
    };
  return { name: 'This device', detail: Platform.OS };
}
