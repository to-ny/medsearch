import 'server-only';

import { sql } from '@/server/db/client';
import type { VMPGroupWithRelations, StandardDosage, DosageParameterBounds } from '@/server/types/entities';
import type { VMPSummary } from '@/server/types/summaries';

/**
 * Get a VMP Group by code with all relationships
 */
export async function getVMPGroupWithRelations(code: string): Promise<VMPGroupWithRelations | null> {
  // Get base VMP Group data
  const result = await sql`
    SELECT
      code,
      name,
      no_generic_prescription_reason,
      no_switch_reason,
      patient_frailty_indicator,
      start_date,
      end_date
    FROM vmp_group
    WHERE code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get VMPs
  const vmpsResult = await sql`
    SELECT DISTINCT ON (vmp.code)
      vmp.code,
      vmp.name,
      vmp.status,
      vmp.vtm_code,
      vmp.vmp_group_code
    FROM vmp
    WHERE vmp.vmp_group_code = ${code}
      AND (vmp.end_date IS NULL OR vmp.end_date > CURRENT_DATE)
    ORDER BY vmp.code, vmp.name->>'en'
  `;

  const vmps: VMPSummary[] = vmpsResult.rows.map((v) => ({
    entityType: 'vmp',
    code: v.code,
    name: v.name,
    status: v.status,
    vtmCode: v.vtm_code,
    vmpGroupCode: v.vmp_group_code,
  }));

  // Get dosages with parameter bounds
  const dosagesResult = await sql`
    SELECT DISTINCT ON (sd.code)
      sd.code,
      sd.vmp_group_code,
      sd.target_group,
      sd.kidney_failure_class,
      sd.liver_failure_class,
      sd.treatment_duration_type,
      sd.temporality_duration_value,
      sd.temporality_duration_unit,
      sd.temporality_user_provided,
      sd.temporality_note,
      sd.quantity,
      sd.quantity_denominator,
      sd.quantity_range_lower,
      sd.quantity_range_upper,
      sd.administration_frequency_quantity,
      sd.administration_frequency_is_max,
      sd.administration_frequency_timeframe_value,
      sd.administration_frequency_timeframe_unit,
      sd.maximum_administration_quantity,
      sd.maximum_daily_quantity_value,
      sd.maximum_daily_quantity_unit,
      sd.maximum_daily_quantity_multiplier,
      sd.textual_dosage,
      sd.supplementary_info,
      sd.route_specification,
      sd.indication_code,
      sd.indication_name,
      sd.route_of_administration_code,
      sd.start_date,
      sd.end_date
    FROM standard_dosage sd
    WHERE sd.vmp_group_code = ${code}
      AND (sd.end_date IS NULL OR sd.end_date > CURRENT_DATE)
    ORDER BY sd.code, sd.target_group, sd.indication_name->>'en'
  `;

  // Get parameter bounds for each dosage
  const dosages: StandardDosage[] = await Promise.all(
    dosagesResult.rows.map(async (d) => {
      const boundsResult = await sql`
        SELECT DISTINCT ON (dpb.parameter_code)
          dpb.parameter_code,
          dp.name as parameter_name,
          dpb.lower_bound_value,
          dpb.lower_bound_unit,
          dpb.upper_bound_value,
          dpb.upper_bound_unit
        FROM dosage_parameter_bounds dpb
        LEFT JOIN dosage_parameter dp ON dp.code = dpb.parameter_code
        WHERE dpb.dosage_code = ${d.code}
        ORDER BY dpb.parameter_code
      `;

      const parameterBounds: DosageParameterBounds[] = boundsResult.rows.map((b) => ({
        parameterCode: b.parameter_code,
        parameterName: b.parameter_name,
        lowerBoundValue: b.lower_bound_value,
        lowerBoundUnit: b.lower_bound_unit,
        upperBoundValue: b.upper_bound_value,
        upperBoundUnit: b.upper_bound_unit,
      }));

      return {
        code: d.code,
        vmpGroupCode: d.vmp_group_code,
        targetGroup: d.target_group,
        kidneyFailureClass: d.kidney_failure_class,
        liverFailureClass: d.liver_failure_class,
        treatmentDurationType: d.treatment_duration_type,
        temporalityDurationValue: d.temporality_duration_value,
        temporalityDurationUnit: d.temporality_duration_unit,
        temporalityUserProvided: d.temporality_user_provided,
        temporalityNote: d.temporality_note,
        quantity: d.quantity,
        quantityDenominator: d.quantity_denominator,
        quantityRangeLower: d.quantity_range_lower,
        quantityRangeUpper: d.quantity_range_upper,
        administrationFrequencyQuantity: d.administration_frequency_quantity,
        administrationFrequencyIsMax: d.administration_frequency_is_max,
        administrationFrequencyTimeframeValue: d.administration_frequency_timeframe_value,
        administrationFrequencyTimeframeUnit: d.administration_frequency_timeframe_unit,
        maximumAdministrationQuantity: d.maximum_administration_quantity,
        maximumDailyQuantityValue: d.maximum_daily_quantity_value,
        maximumDailyQuantityUnit: d.maximum_daily_quantity_unit,
        maximumDailyQuantityMultiplier: d.maximum_daily_quantity_multiplier,
        textualDosage: d.textual_dosage,
        supplementaryInfo: d.supplementary_info,
        routeSpecification: d.route_specification,
        indicationCode: d.indication_code,
        indicationName: d.indication_name,
        routeOfAdministrationCode: d.route_of_administration_code,
        startDate: d.start_date,
        endDate: d.end_date,
        parameterBounds,
      };
    })
  );

  return {
    code: row.code,
    name: row.name,
    noGenericPrescriptionReason: row.no_generic_prescription_reason,
    noSwitchReason: row.no_switch_reason,
    patientFrailtyIndicator: row.patient_frailty_indicator,
    startDate: row.start_date,
    endDate: row.end_date,
    vmps,
    dosages,
  };
}
