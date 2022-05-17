import { Link } from "raviger";
import { GENDER } from "../../../Common/constants";
import { getDimensionOrDash } from "../../../Common/utils";
import { PatientModel } from "../../Patient/models";
import { RightArrowIcon } from "../Icons/ArrowIcon";
import { Modal } from "@material-ui/core";
import Beds from "../../Facility/Consultations/Beds";
import { useState } from "react";

export interface ITeleICUPatientInfoCardProps {
  patient: PatientModel;
}

export default function TeleICUPatientInfoCard({
  patient,
}: ITeleICUPatientInfoCardProps) {
  const [open, setOpen] = useState(false);
  console.log(patient);
  return (
    <section className="flex items-stretch my-2 lg:flex-row flex-col space-y-3 lg:space-y-0 lg:space-x-2">
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="bg-white md:w-4/5 p-4 mx-auto ">
          {patient?.facility &&
          patient?.id &&
          patient?.last_consultation?.id ? (
            <Beds
              facilityId={patient?.facility}
              patientId={patient?.id}
              consultationId={patient?.last_consultation?.id}
            />
          ) : (
            <div>Invalid Patient Data</div>
          )}
        </div>
      </Modal>
      <div className="bg-white border-b p-5 flex items-center lg:w-7/12 w-full">
        {!patient.last_consultation?.current_bed ? (
          <button
            className="text-sm text-primary-600 hover:bg-gray-300 p-2 rounded"
            onClick={() => setOpen(true)}
          >
            Assign Bed
          </button>
        ) : (
          <div className="flex flex-col items-center ">
            <div className="text-lg border border-cool-gray-600 rounded p-2 m-2">
              {patient.last_consultation?.current_bed?.bed_object?.name}
            </div>
            <button
              className="text-sm text-primary-600 hover:bg-gray-300 p-2 rounded"
              onClick={() => setOpen(true)}
            >
              Switch Bed
            </button>
          </div>
        )}
        <div className="pl-4">
          <p className="sm:text-xl md:text-4xl font-semibold ml-1">
            {patient.name}
          </p>
          <p className="text-sm sm:text-base my-1 ml-1 text-primary-800">
            <span>{patient.age} years</span>
            <span className="mx-2">•</span>
            <span>{patient.gender && GENDER[patient.gender]}</span>
          </p>
          <div className="text-sm flex flex-wrap">
            {patient.blood_group && (
              <div className="m-1">
                <span className="font-light text-primary-600 text-xs mr-1">
                  Blood Group
                </span>
                <span className="sm:text-base font-semibold text-sm mr-2">
                  {patient.blood_group}
                </span>
              </div>
            )}
            {patient.last_consultation?.weight ? (
              <div className="m-1">
                <span className="font-light text-primary-600 text-sm mr-1">
                  Weight
                </span>
                <span className="sm:text-base font-semibold text-sm mr-2">
                  {getDimensionOrDash(patient.last_consultation.weight, " kg")}
                </span>
              </div>
            ) : (
              <></>
            )}
            {patient.last_consultation?.height ? (
              <div className="m-1">
                <span className="font-light text-primary-600 text-sm mr-1">
                  Height
                </span>
                <span className="sm:text-base font-semibold text-sm mr-2">
                  {getDimensionOrDash(patient.last_consultation?.height, "cm")}
                </span>
              </div>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 flex-1 gap-y-2">
        {patient.last_consultation?.id && (
          <Link
            href={`/facility/${patient.facility}/patient/${patient.id}/consultation/${patient.last_consultation?.id}/update`}
            className="rounded-md bg-white shadow-sm text-primary-900 flex justify-between items-center p-2 px-4 sm:px-2 hover:bg-gray-200 cursor-pointer active:translate-y-1 transform"
          >
            <p className="text-sm sm:text-base px-2 font-semibold">
              Edit Consultation Details
            </p>
            <span>
              <i className="fas fa-pencil-alt mr-2"></i>
            </span>
          </Link>
        )}

        {patient.last_consultation?.id && (
          <Link
            href={`/facility/${patient.facility}/patient/${patient.id}/consultation/${patient.last_consultation?.id}/daily-rounds`}
            className="rounded-md bg-white shadow-sm text-primary-900 flex justify-between items-center p-2 px-4 sm:px-2 hover:bg-gray-200 cursor-pointer active:translate-y-1 transform"
          >
            <p className="text-sm sm:text-base px-2 font-semibold">
              Log Update
            </p>
            <span>
              <i className="font-bold fas fa-plus mr-2"></i>
            </span>
          </Link>
        )}
        <Link
          href={`/patient/${patient.id}/investigation_reports`}
          className="rounded-md bg-white shadow-sm text-primary-900 flex justify-between items-center p-2 px-4 sm:px-2 hover:bg-gray-200 cursor-pointer active:translate-y-1 transform"
        >
          <p className="text-sm sm:text-base px-2 font-semibold">
            Investigation Summary
          </p>
          <span>
            <RightArrowIcon />
          </span>
        </Link>
        {patient.last_consultation?.id && (
          <Link
            href={`/facility/${patient.facility}/patient/${patient.id}/consultation/${patient.last_consultation?.id}/treatment-summary`}
            className="rounded-md bg-white shadow-sm text-primary-900 flex justify-between items-center p-2 px-4 sm:px-2 hover:bg-gray-200 cursor-pointer active:translate-y-1 transform"
          >
            <p className="text-sm sm:text-base px-2 font-semibold">
              Treatment Summary
            </p>
            <span>
              <RightArrowIcon />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
