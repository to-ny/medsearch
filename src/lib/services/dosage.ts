/**
 * Standard Dosage service
 * Handles fetching dosage recommendations from the SAM v2 API
 */

import 'server-only';

import { soapRequest } from '@/lib/soap/client';
import { buildFindStandardDosageRequest } from '@/lib/soap/xml-builder';
import {
  parseFindStandardDosageResponse,
  extractAllTextVersions,
  getTextArray,
  type RawStandardDosageData,
  type RawQuantityData,
  type RawDosageParameterData,
  type RawParameterBoundsData,
  type RawRouteOfAdministrationData,
  type RawAdditionalFieldData,
} from '@/lib/soap/xml-parser';
import type {
  StandardDosage,
  DosageQuantity,
  DosageParameter,
  DosageParameterBounds,
  DosageRoute,
  DosageIndication,
  DosageAdditionalFields,
  ParameterizedQuantity,
  LocalizedText,
  ApiResponse,
} from '@/lib/types';

/**
 * Transforms raw quantity data to DosageQuantity
 */
function transformQuantity(raw: RawQuantityData | undefined): DosageQuantity | undefined {
  if (!raw || raw['#text'] === undefined) return undefined;
  return {
    value: Number(raw['#text']),
    unit: raw['@_Unit'] || '',
  };
}

/**
 * Transforms raw dosage parameter to DosageParameter
 */
function transformParameter(raw: RawDosageParameterData | undefined): DosageParameter | undefined {
  if (!raw) return undefined;
  return {
    code: raw['@_code'] || '',
    name: extractAllTextVersions(getTextArray(raw.Name)),
    definition: extractAllTextVersions(getTextArray(raw.Definition)),
    standardUnit: raw.StandardUnit,
  };
}

/**
 * Transforms raw parameter bounds to DosageParameterBounds
 */
function transformParameterBounds(raw: RawParameterBoundsData): DosageParameterBounds | null {
  const parameter = transformParameter(raw.DosageParameter);
  if (!parameter) return null;

  return {
    parameter,
    lowerBound: transformQuantity(raw.LowerBound),
    upperBound: transformQuantity(raw.UpperBound),
  };
}

/**
 * Transforms raw route of administration
 */
function transformRoute(raw: RawRouteOfAdministrationData): DosageRoute {
  return {
    code: raw['@_Code'] || '',
    name: extractAllTextVersions(getTextArray(raw.Name)),
    standardRoute: raw.StandardRoute ? {
      standard: raw.StandardRoute['@_Standard'] || '',
      code: raw.StandardRoute['@_Code'] || '',
    } : undefined,
  };
}

/**
 * Transforms additional fields into structured format
 */
function transformAdditionalFields(fields: RawAdditionalFieldData[] | undefined): DosageAdditionalFields {
  const result: DosageAdditionalFields = {};
  if (!fields) return result;

  const posologyItems: LocalizedText[] = [];
  const dosageStringItems: LocalizedText[] = [];
  const selectionStringItems: LocalizedText[] = [];

  for (const field of fields) {
    const key = field.Key || '';
    const value = field.Value || '';
    if (!value) continue;

    if (key.startsWith('posology_')) {
      const lang = key.replace('posology_', '');
      posologyItems.push({ text: value, language: lang });
    } else if (key.startsWith('dosage_string_')) {
      const lang = key.replace('dosage_string_', '');
      dosageStringItems.push({ text: value, language: lang });
    } else if (key.startsWith('selection_string_')) {
      const lang = key.replace('selection_string_', '');
      selectionStringItems.push({ text: value, language: lang });
    }
  }

  if (posologyItems.length > 0) result.posology = posologyItems;
  if (dosageStringItems.length > 0) result.dosageString = dosageStringItems;
  if (selectionStringItems.length > 0) result.selectionString = selectionStringItems;

  return result;
}

/**
 * Transforms raw standard dosage data to StandardDosage type
 */
function transformStandardDosage(raw: RawStandardDosageData): StandardDosage {
  // Transform indication
  let indication: DosageIndication | undefined;
  if (raw.Indication) {
    indication = {
      code: raw.Indication['@_code'] || '',
      name: extractAllTextVersions(getTextArray(raw.Indication.Name)),
    };
  }

  // Transform parameter bounds
  const parameterBounds: DosageParameterBounds[] = (raw.ParameterBounds || [])
    .map((pb) => transformParameterBounds(pb))
    .filter((pb): pb is DosageParameterBounds => pb !== null);

  // Transform route of administration (take the first one if multiple)
  const routes = raw.RouteOfAdministration || [];
  const routeOfAdministration = routes.length > 0 ? transformRoute(routes[0]) : undefined;

  // Transform maximum daily quantity
  let maximumDailyQuantity: ParameterizedQuantity | undefined;
  if (raw.MaximumDailyQuantity) {
    const qty = transformQuantity(raw.MaximumDailyQuantity.Quantity);
    if (qty) {
      maximumDailyQuantity = {
        quantity: qty,
        multiplier: raw.MaximumDailyQuantity.Multiplier,
        parameter: transformParameter(raw.MaximumDailyQuantity.Parameter),
      };
    }
  }

  return {
    code: String(raw['@_Code'] || ''),
    targetGroup: (raw.TargetGroup as StandardDosage['targetGroup']) || 'ADULT',
    kidneyFailureClass: raw.KidneyFailureClass,
    liverFailureClass: raw.LiverFailureClass,
    treatmentDurationType: (raw.TreatmentDurationType as StandardDosage['treatmentDurationType']) || 'IF_NECESSARY',
    temporalityDuration: transformQuantity(raw.TemporalityDuration),
    temporalityUserProvided: raw.TemporalityUserProvided,
    temporalityNote: extractAllTextVersions(getTextArray(raw.TemporalityNote)),
    quantity: raw.Quantity,
    quantityDenominator: raw.QuantityDenominator,
    quantityRangeLower: raw.QuantityRangeLower,
    quantityRangeUpper: raw.QuantityRangeUpper,
    administrationFrequencyQuantity: raw.AdministrationFrequencyQuantity,
    administrationFrequencyIsMax: raw.AdministrationFrequencyIsMax,
    administrationFrequencyTimeframe: transformQuantity(raw.AdministrationFrequencyTimeframe),
    maximumAdministrationQuantity: raw.MaximumAdministrationQuantity,
    maximumDailyQuantity,
    textualDosage: extractAllTextVersions(getTextArray(raw.TextualDosage)),
    supplementaryInfo: extractAllTextVersions(getTextArray(raw.SupplementaryInfo)),
    routeSpecification: extractAllTextVersions(getTextArray(raw.RouteSpecification)),
    indication,
    parameterBounds: parameterBounds.length > 0 ? parameterBounds : undefined,
    routeOfAdministration,
    additionalFields: transformAdditionalFields(raw.AdditionalFields),
  };
}

/**
 * Gets standard dosages by VmpGroup code
 */
export async function getStandardDosagesByVmpGroup(
  vmpGroupCode: string
): Promise<ApiResponse<StandardDosage[]>> {
  try {
    const soapXml = buildFindStandardDosageRequest({
      vmpGroupCode,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'medications', // Long cache - clinical reference data
    });
    const parsed = parseFindStandardDosageResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const dosages = parsed.data.map((raw) => transformStandardDosage(raw));

    return {
      success: true,
      data: dosages,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: dosages.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Request failed',
      },
    };
  }
}

/**
 * Searches for standard dosages by name
 */
export async function searchStandardDosages(
  query: string
): Promise<ApiResponse<StandardDosage[]>> {
  try {
    const soapXml = buildFindStandardDosageRequest({
      anyNamePart: query,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'medications',
    });
    const parsed = parseFindStandardDosageResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const dosages = parsed.data.map((raw) => transformStandardDosage(raw));

    return {
      success: true,
      data: dosages,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: dosages.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Request failed',
      },
    };
  }
}
