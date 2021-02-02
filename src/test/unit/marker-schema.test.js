/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import {
  formatFromMarkerSchema,
  parseLabel,
  markerSchemaFrontEndOnly,
} from '../../profile-logic/marker-schema';
import type { MarkerSchema, Marker } from 'firefox-profiler/types';
import { getDefaultCategories } from '../../profile-logic/data-structures';
import { storeWithProfile } from '../fixtures/stores';
import { getMarkerSchema } from '../../selectors/profile';
import { getProfileFromTextSamples } from '../fixtures/profiles/processed-profile';
import { markerSchemaForTests } from '../fixtures/profiles/marker-schema';

/**
 * Generally, higher level type of testing is preferred to detailed unit tests of
 * implementation behavior, but the marker schema labels use a custom mini-parser, and
 * it would be easy for them to have errors. These tests cover a variety of different
 * code branches, especially parse errors.
 */
describe('marker schema labels', function() {
  type LabelOptions = {|
    schemaData: $PropertyType<MarkerSchema, 'data'>,
    label: string,
    payload: any,
  |};

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  function applyLabel(options: LabelOptions): string {
    const { schemaData, label, payload } = options;
    const categories = getDefaultCategories();

    const schema = {
      name: 'TestDefinedMarker',
      display: [],
      data: schemaData,
    };

    const marker: Marker = {
      start: 2,
      end: 5,
      name: 'TestDefinedMarker',
      category: 0,
      data: payload,
    };
    const getter = parseLabel(schema, categories, label);

    // There is only one marker, marker 0
    return getter(marker);
  }

  it('can parse very simple labels', function() {
    expect(
      applyLabel({
        label: 'Just text',
        schemaData: [],
        payload: {},
      })
    ).toEqual('Just text');
    expect(console.error).toBeCalledTimes(0);
  });

  it('can parse a label with just a lookup value', function() {
    expect(
      applyLabel({
        label: '{marker.data.duration}',
        schemaData: [{ key: 'duration', label: 'Duration', format: 'seconds' }],
        payload: { duration: 12345 },
      })
    ).toEqual('12.345s');
    expect(console.error).toBeCalledTimes(0);
  });

  it('can parse a label with surrounding text', function() {
    expect(
      applyLabel({
        label: 'It took {marker.data.duration} for this test.',
        schemaData: [{ key: 'duration', label: 'Duration', format: 'seconds' }],
        payload: { duration: 12345 },
      })
    ).toEqual('It took 12.345s for this test.');
    expect(console.error).toBeCalledTimes(0);
  });

  it('can mix and match lookups', function() {
    expect(
      applyLabel({
        label: 'It took {marker.data.duration}, which is {marker.data.ratio}',
        schemaData: [
          { key: 'duration', label: 'Duration', format: 'seconds' },
          { key: 'ratio', label: 'Ratio', format: 'percentage' },
        ],
        payload: {
          duration: 12345,
          ratio: 0.12345,
        },
      })
    ).toEqual('It took 12.345s, which is 12%');
    expect(console.error).toBeCalledTimes(0);
  });

  it('is empty if there is no information in a payload', function() {
    expect(
      applyLabel({
        label: 'This will be nothing: "{marker.data.nokey}"',
        schemaData: [{ key: 'duration', label: 'Duration', format: 'seconds' }],
        payload: { duration: 12345 },
      })
    ).toEqual('This will be nothing: ""');
    expect(console.error).toBeCalledTimes(0);
  });

  it('can look up various parts of the marker', function() {
    const text = applyLabel({
      label: [
        'Start: {marker.start}',
        'End: {marker.end}',
        'Duration: {marker.duration}',
        'Name: {marker.name}',
        'Category: {marker.category}',
      ].join('\n'),
      schemaData: [],
      payload: {},
    });

    expect(text.split('\n')).toEqual([
      'Start: 2ms',
      'End: 5ms',
      'Duration: 3ms',
      'Name: TestDefinedMarker',
      'Category: Idle',
    ]);
    expect(console.error).toBeCalledTimes(0);
  });

  describe('parseErrors', function() {
    function testParseError(label: string) {
      expect(
        applyLabel({
          label,
          schemaData: [
            { key: 'duration', label: 'Duration', format: 'seconds' },
          ],
          payload: { duration: 12345 },
        })
      ).toEqual('Parse error: ""');
      expect(console.error).toBeCalledTimes(1);
      expect(console.error.mock.calls).toMatchSnapshot();
    }

    // eslint-disable-next-line jest/expect-expect
    it('errors if not looking up into a marker', function() {
      testParseError('Parse error: "{duration}"');
    });

    // eslint-disable-next-line jest/expect-expect
    it('errors if looking up into a part of the marker that does not exist', function() {
      testParseError('Parse error: "{marker.nothing}"');
    });

    // eslint-disable-next-line jest/expect-expect
    it('errors when accessing random properties', function() {
      testParseError('Parse error: "{property.value}"');
    });

    // eslint-disable-next-line jest/expect-expect
    it('errors when accessing twice into a payload', function() {
      testParseError('Parse error: "{marker.data.duration.extra}"');
    });
  });
});

describe('marker schema formatting', function() {
  it('can apply a variety of formats', function() {
    const entries = [
      ['url', 'http://example.com'],
      ['file-path', '/Users/me/gecko'],
      ['file-path', null],
      ['file-path', undefined],
      ['duration', 0],
      ['duration', 10],
      ['duration', 12.3456789],
      ['duration', 123456.789],
      ['duration', 0.000123456],
      ['time', 12.3456789],
      ['seconds', 0],
      ['seconds', 10],
      ['seconds', 12.3456789],
      ['seconds', 123456.789],
      ['seconds', 0.000123456],
      ['milliseconds', 0],
      ['milliseconds', 10],
      ['milliseconds', 12.3456789],
      ['milliseconds', 123456.789],
      ['milliseconds', 0.000123456],
      ['microseconds', 0],
      ['microseconds', 10],
      ['microseconds', 12.3456789],
      ['microseconds', 123456.789],
      ['microseconds', 0.000123456],
      ['nanoseconds', 0],
      ['nanoseconds', 10],
      ['nanoseconds', 12.3456789],
      ['nanoseconds', 123456.789],
      ['nanoseconds', 0.000123456],
      ['bytes', 0],
      ['bytes', 10],
      ['bytes', 12.3456789],
      ['bytes', 123456.789],
      ['bytes', 0.000123456],
      ['integer', 0],
      ['integer', 10],
      ['integer', 12.3456789],
      ['integer', 123456.789],
      ['integer', 0.000123456],
      ['decimal', 0],
      ['decimal', 10],
      ['decimal', 12.3456789],
      ['decimal', 123456.789],
      ['decimal', 0.000123456],
      ['percentage', 0],
      ['percentage', 0.1],
      ['percentage', 0.123456789],
      ['percentage', 1234.56789],
      ['percentage', 0.000123456],
    ];

    expect(
      entries.map(
        ([format, value]) =>
          format + ' - ' + formatFromMarkerSchema('none', format, value)
      )
    ).toMatchInlineSnapshot(`
      Array [
        "url - http://example.com",
        "file-path - /Users/me/gecko",
        "file-path - (empty)",
        "file-path - (empty)",
        "duration - 0s",
        "duration - 10ms",
        "duration - 12.346ms",
        "duration - 123.46s",
        "duration - 123.46ns",
        "time - 12.346ms",
        "seconds - 0.000s",
        "seconds - 0.010s",
        "seconds - 0.012s",
        "seconds - 123.46s",
        "seconds - 0.000s",
        "milliseconds - 0.000ms",
        "milliseconds - 10ms",
        "milliseconds - 12ms",
        "milliseconds - 1,23,457ms",
        "milliseconds - 0.000ms",
        "microseconds - 0.000μs",
        "microseconds - 10μs",
        "microseconds - 12μs",
        "microseconds - 1,23,457μs",
        "microseconds - 0.000μs",
        "nanoseconds - 0.0000ns",
        "nanoseconds - 10.0ns",
        "nanoseconds - 12.3ns",
        "nanoseconds - 1,23,457ns",
        "nanoseconds - 0.0001ns",
        "bytes - 0.000B",
        "bytes - 10B",
        "bytes - 12B",
        "bytes - 121KB",
        "bytes - 0.000B",
        "integer - 0",
        "integer - 10",
        "integer - 12",
        "integer - 1,23,457",
        "integer - 0",
        "decimal - 0.000",
        "decimal - 10",
        "decimal - 12",
        "decimal - 1,23,457",
        "decimal - 0.000",
        "percentage - 0.0%",
        "percentage - 10%",
        "percentage - 12%",
        "percentage - 1,23,457%",
        "percentage - 0.0%",
      ]
    `);
  });
});

describe('getMarkerSchema', function() {
  it('combines front-end and Gecko marker schema', function() {
    const { profile } = getProfileFromTextSamples('A');
    profile.meta.markerSchema = markerSchemaForTests;
    const { getState } = storeWithProfile(profile);
    const combinedSchema = getMarkerSchema(getState());

    // Find front-end only marker schema.
    expect(
      profile.meta.markerSchema.find(schema => schema.name === 'Jank')
    ).toBeUndefined();
    expect(
      markerSchemaFrontEndOnly.find(schema => schema.name === 'Jank')
    ).toBeTruthy();
    expect(combinedSchema.find(schema => schema.name === 'Jank')).toBeTruthy();

    // Find the Gecko only marker schema.
    expect(
      profile.meta.markerSchema.find(schema => schema.name === 'GCMajor')
    ).toBeTruthy();
    expect(
      markerSchemaFrontEndOnly.find(schema => schema.name === 'GCMajor')
    ).toBeUndefined();
    expect(
      combinedSchema.find(schema => schema.name === 'GCMajor')
    ).toBeTruthy();
  });
});
