import { Button, CircularProgress } from "@material-ui/core";
import { navigate } from "raviger";
import moment from "moment";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { GENDER_TYPES, SAMPLE_TEST_STATUS } from "../../Common/constants";
import loadable from "@loadable/component";
import { statusType, useAbortableEffect } from "../../Common/utils";
import { OnlineUsersSelect } from "../Common/OnlineUsersSelect";
import {
  getConsultationList,
  listShiftRequests,
  getPatient,
  getSampleTestList,
  patchSample,
  patchPatient,
  completeTransfer,
} from "../../Redux/actions";
import * as Notification from "../../Utils/Notifications";
import AlertDialog from "../Common/AlertDialog";
import Pagination from "../Common/Pagination";
import { ConsultationCard } from "../Facility/ConsultationCard";
import { ConsultationModel } from "../Facility/models";
import { PatientModel, SampleTestModel } from "./models";
import { SampleTestCard } from "./SampleTestCard";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogTitle from "@material-ui/core/DialogTitle";
import { ErrorHelperText } from "../Common/HelperInputFields";
import Modal from "@material-ui/core/Modal";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import { RoleButton } from "../Common/RoleButton";
import clsx from "clsx";

const Loading = loadable(() => import("../Common/Loading"));
const PageTitle = loadable(() => import("../Common/PageTitle"));

export const PatientHome = (props: any) => {
  const { facilityId, id } = props;
  const dispatch: any = useDispatch();
  const [showShifts, setShowShifts] = useState(false);
  const [isShiftClicked, setIsShiftClicked] = useState(false);
  const [isShiftDataLoaded, setIsShiftDataLoaded] = useState(false);
  const [patientData, setPatientData] = useState<PatientModel>({});
  const [consultationListData, setConsultationListData] = useState<
    Array<ConsultationModel>
  >([]);
  const [sampleListData, setSampleListData] = useState<Array<SampleTestModel>>(
    []
  );
  const [activeShiftingData, setActiveShiftingData] = useState<Array<any>>([]);
  const [assignedVolunteerObject, setAssignedVolunteerObject] =
    useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalConsultationCount, setTotalConsultationCount] = useState(0);
  const [currentConsultationPage, setCurrentConsultationPage] = useState(1);
  const [consultationOffset, setConsultationOffset] = useState(0);
  const [totalSampleListCount, setTotalSampleListCount] = useState(0);
  const [currentSampleListPage, setCurrentSampleListPage] = useState(1);
  const [sampleListOffset, setSampleListOffset] = useState(0);
  const [isConsultationLoading, setIsConsultationLoading] = useState(false);
  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const [sampleFlag, callSampleList] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<{
    status: number;
    sample: any;
  }>({ status: 0, sample: null });
  const [showAlertMessage, setAlertMessage] = useState({
    show: false,
    message: "",
    title: "",
  });
  const [modalFor, setModalFor] = useState({
    externalId: undefined,
    loading: false,
  });
  const [openAssignVolunteerDialog, setOpenAssignVolunteerDialog] =
    React.useState(false);

  const initErr: any = {};
  const errors = initErr;

  console.log(
    patientData.is_active,
    patientData?.last_consultation,
    patientData.is_active &&
      (!patientData?.last_consultation ||
        patientData?.last_consultation?.discharge_date)
  );

  useEffect(() => {
    setAssignedVolunteerObject(patientData.assigned_to_object);
  }, [patientData.assigned_to_object]);

  const handleTransferComplete = (shift: any) => {
    setModalFor({ ...modalFor, loading: true });
    dispatch(completeTransfer({ externalId: modalFor })).then(() => {
      navigate(
        `/facility/${shift.assigned_facility}/patient/${shift.patient}/consultation`
      );
    });
  };

  const handleAssignedVolunteer = () => {
    dispatch(
      patchPatient(
        {
          assigned_to: assignedVolunteerObject
            ? assignedVolunteerObject.id
            : null,
        },
        { id: patientData.id }
      )
    ).then((response: any) => {
      if ((response || {}).status === 200) {
        const dummyPatientData = Object.assign({}, patientData);
        dummyPatientData["assigned_to"] = assignedVolunteerObject;
        setPatientData(dummyPatientData);
        if (assignedVolunteerObject)
          Notification.Success({
            msg: "Volunteer assigned successfully.",
          });
        else
          Notification.Success({
            msg: "Volunteer unassigned successfully.",
          });
        document.location.reload();
      }
    });
    setOpenAssignVolunteerDialog(false);
    if (errors["assignedVolunteer"]) delete errors["assignedVolunteer"];
  };

  const handlePatientTransfer = (value: boolean) => {
    const dummyPatientData = Object.assign({}, patientData);
    dummyPatientData["allow_transfer"] = value;

    dispatch(
      patchPatient({ allow_transfer: value }, { id: patientData.id })
    ).then((response: any) => {
      if ((response || {}).status === 200) {
        const dummyPatientData = Object.assign({}, patientData);
        dummyPatientData["allow_transfer"] = value;
        setPatientData(dummyPatientData);

        Notification.Success({
          msg: "Transfer status updated.",
        });
      }
    });
  };

  function Badge(props: { color: string; icon: string; text: string }) {
    return (
      <span
        className="inline-flex items-center py-1 rounded-full text-xs font-medium leading-4 bg-gray-100 text-gray-700"
        title={props.text}
      >
        <i
          className={
            "mr-2 text-md text-" + props.color + "-500 fas fa-" + props.icon
          }
        ></i>
        {props.text}
      </span>
    );
  }

  const handleVolunteerSelect = (volunteer: any) => {
    setAssignedVolunteerObject(volunteer);
  };

  const limit = 5;

  const fetchpatient = useCallback(
    async (status: statusType) => {
      setIsLoading(true);
      const patientRes = await dispatch(getPatient({ id }));
      if (!status.aborted) {
        if (patientRes && patientRes.data) {
          setPatientData(patientRes.data);
        }
        setIsLoading(false);
      }
    },
    [dispatch, id]
  );

  const fetchConsultation = useCallback(
    async (status: statusType) => {
      setIsConsultationLoading(true);
      const consultationRes = await dispatch(
        getConsultationList({ patient: id, limit, offset: consultationOffset })
      );
      if (!status.aborted) {
        if (
          consultationRes &&
          consultationRes.data &&
          consultationRes.data.results
        ) {
          setConsultationListData(consultationRes.data.results);
          setTotalConsultationCount(consultationRes.data.count);
        }
        setIsConsultationLoading(false);
      }
    },
    [dispatch, id, consultationOffset]
  );

  const fetchSampleTest = useCallback(
    async (status: statusType) => {
      setIsSampleLoading(true);
      const sampleRes = await dispatch(
        getSampleTestList(
          { limit, offset: sampleListOffset },
          { patientId: id }
        )
      );
      if (!status.aborted) {
        if (sampleRes && sampleRes.data && sampleRes.data.results) {
          setSampleListData(sampleRes.data.results);
          setTotalSampleListCount(sampleRes.data.count);
        }
        setIsSampleLoading(false);
      }
    },
    [dispatch, id, sampleListOffset]
  );

  const fetchActiveShiftingData = useCallback(
    async (status: statusType) => {
      const shiftingRes = isShiftClicked
        ? await dispatch(listShiftRequests({ patient: id }, "shift-list-call"))
        : activeShiftingData;
      setIsShiftDataLoaded(isShiftClicked);
      if (!status.aborted) {
        if (shiftingRes && shiftingRes.data && shiftingRes.data.results) {
          const activeShiftingRes: any[] = shiftingRes.data.results;
          setActiveShiftingData(activeShiftingRes);
        }
      }
    },
    [dispatch, id, isShiftClicked]
  );

  useAbortableEffect(
    (status: statusType) => {
      fetchpatient(status);
    },
    [dispatch, fetchpatient]
  );

  useAbortableEffect(
    (status: statusType) => {
      fetchConsultation(status);
    },
    [dispatch, fetchConsultation]
  );

  useAbortableEffect(
    (status: statusType) => {
      fetchSampleTest(status);
    },
    [dispatch, fetchSampleTest, sampleFlag]
  );

  useAbortableEffect(
    (status: statusType) => {
      fetchActiveShiftingData(status);
    },
    [dispatch, fetchActiveShiftingData]
  );

  const handleConsultationPagination = (page: number, limit: number) => {
    const offset = (page - 1) * limit;
    setCurrentConsultationPage(page);
    setConsultationOffset(offset);
  };

  const handleSampleListPagination = (page: number, limit: number) => {
    const offset = (page - 1) * limit;
    setCurrentSampleListPage(page);
    setSampleListOffset(offset);
  };

  const dismissAlert = () => {
    setAlertMessage({
      show: false,
      message: "",
      title: "",
    });
  };

  const confirmApproval = (status: number, sample: any) => {
    setSelectedStatus({ status, sample });
    setAlertMessage({
      show: true,
      message: "Are you sure you want to send the sample to Collection Centre?",
      title: "Confirm",
    });
  };

  const handleApproval = async () => {
    const { status, sample } = selectedStatus;
    const sampleData = {
      id: sample.id,
      status,
      consultation: sample.consultation,
    };
    const statusName = SAMPLE_TEST_STATUS.find((i) => i.id === status)?.desc;

    const res = await dispatch(patchSample(sampleData, { id: sample.id }));
    if (res && (res.status === 201 || res.status === 200)) {
      Notification.Success({
        msg: `Request ${statusName}`,
      });
      callSampleList(!sampleFlag);
    }

    dismissAlert();
  };

  if (isLoading) {
    return <Loading />;
  }

  const patientGender = GENDER_TYPES.find(
    (i) => i.id === patientData.gender
  )?.text;

  let patientMedHis: any[] = [];
  if (
    patientData &&
    patientData.medical_history &&
    patientData.medical_history.length
  ) {
    const medHis = patientData.medical_history;
    patientMedHis = medHis.map((item: any, idx: number) => (
      <div className="sm:col-span-1" key={`med_his_${idx}`}>
        {item?.disease != "NO" && (
          <>
            <div className="text-sm leading-5 font-medium text-gray-500">
              {item.disease}
            </div>
            <div className="mt-1 text-sm leading-5 text-gray-900 whitespace-pre-wrap">
              {item.details}
            </div>
          </>
        )}
      </div>
    ));
  }

  let consultationList, sampleList;

  if (isConsultationLoading) {
    consultationList = <CircularProgress size={20} />;
  } else if (consultationListData.length === 0) {
    consultationList = (
      <div>
        <hr />
        <div className="p-4 text-xl text-gray-500 font-bold flex justify-center items-center border-2 border-solid border-gray-200">
          No Data Found
        </div>
      </div>
    );
  } else if (consultationListData.length > 0) {
    consultationList = consultationListData.map((itemData, idx) => (
      <ConsultationCard
        itemData={itemData}
        key={idx}
        isLastConsultation={itemData.id === patientData.last_consultation?.id}
      />
    ));
  }

  if (isSampleLoading) {
    sampleList = <CircularProgress size={20} />;
  } else if (sampleListData.length === 0) {
    sampleList = (
      <div>
        <hr />
        <div className="p-4 text-xl text-gray-500 font-bold flex justify-center items-center border-2 border-solid border-gray-200">
          No Data Found
        </div>
      </div>
    );
  } else if (sampleListData.length > 0) {
    sampleList = sampleListData.map((itemData, idx) => (
      <SampleTestCard
        itemData={itemData}
        key={idx}
        handleApproval={confirmApproval}
        facilityId={facilityId}
        patientId={id}
      />
    ));
  }

  return (
    <div className="px-2 pb-2">
      {showAlertMessage.show && (
        <AlertDialog
          title={showAlertMessage.title}
          message={showAlertMessage.message}
          handleClose={() => handleApproval()}
          handleCancel={() => dismissAlert()}
        />
      )}

      <div id="revamp">
        <PageTitle
          title={"Patient Details"}
          backUrl="/patients"
          crumbsReplacements={{
            [facilityId]: { name: patientData?.facility_object?.name },
            [id]: { name: patientData?.name },
          }}
        />

        <div className="relative mt-2">
          <div className="max-w-screen-xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
            <div className="md:flex">
              {patientData?.last_consultation?.assigned_to_object && (
                <p className="font-bold text-green-800 rounded-lg shadow bg-green-200 p-3 mx-3 flex-1 text-center flex justify-center gap-2">
                  <span className="inline">
                    Assigned Doctor:{" "}
                    {
                      patientData?.last_consultation?.assigned_to_object
                        .first_name
                    }{" "}
                    {
                      patientData?.last_consultation?.assigned_to_object
                        .last_name
                    }
                  </span>
                  {patientData?.last_consultation?.assigned_to_object
                    .alt_phone_number && (
                    <a
                      href={`https://wa.me/${patientData?.last_consultation?.assigned_to_object.alt_phone_number}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fab fa-whatsapp"></i> Video Call
                    </a>
                  )}
                </p>
              )}
              {patientData.assigned_to_object && (
                <p className="font-bold text-primary-800 rounded-lg shadow bg-primary-200 mx-2 p-3 flex-1 text-center">
                  <span className="inline">
                    Assigned Volunteer:{" "}
                    {patientData.assigned_to_object.first_name}{" "}
                    {patientData.assigned_to_object.last_name}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
        {patientData?.facility != patientData?.last_consultation?.facility && (
          <div className="relative mt-2">
            <div className="max-w-screen-xl mx-auto py-3 px-3 sm:px-6 lg:px-8 rounded-lg shadow bg-red-200 ">
              <div className="text-center">
                <p className="font-bold text-red-800">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <span className="inline">
                    You have not created a consultation for the patient in{" "}
                    <strong>{patientData.facility_object?.name || "-"} </strong>
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <button
                className="btn btn-primary w-full"
                disabled={!patientData.is_active}
                onClick={() =>
                  navigate(
                    `/facility/${patientData?.facility}/patient/${id}/consultation`
                  )
                }
              >
                Create Consultation
              </button>
            </div>
          </div>
        )}
        <section
          className="lg:flex items-center mt-4 space-y-2"
          data-testid="patient-dashboard"
        >
          <div className="lg:w-2/3 mx-2 h-full">
            <div className="bg-white rounded-lg shadow p-4 h-full">
              <h1 className="font-bold text-3xl">
                {" "}
                {patientData.name} - {patientData.age}
              </h1>
              <h3 className="font-semibold text-lg">
                <i className="fas fa-hospital mr-2"></i>
                {patientData.facility_object?.name || "-"}
              </h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:gap-y-8 md:grid-cols-2 lg:grid-cols-3 mt-2">
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Date of Birth, Gender
                  </div>
                  <div className="mt-1 text-sm leading-5 text-gray-900">
                    {patientData?.date_of_birth}, {patientGender}
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Phone
                  </div>
                  <div className="mt-1 text-sm leading-5 text-gray-900">
                    <div>
                      <a href={`tel:${patientData.phone_number}`}>
                        {patientData.phone_number || "-"}
                      </a>
                    </div>
                    <div>
                      <a
                        href={`https://wa.me/${patientData.phone_number}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="fab fa-whatsapp"></i> Chat on WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Emergency Contact
                  </div>
                  <div className="mt-1 text-sm leading-5 text-gray-900">
                    <div>
                      <a href={`tel:${patientData.emergency_phone_number}`}>
                        {patientData.emergency_phone_number || "-"}
                      </a>
                    </div>
                    <div>
                      <a
                        href={`https://wa.me/${patientData.emergency_phone_number}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="fab fa-whatsapp"></i> Chat on WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Blood Group
                  </div>
                  <div className="mt-1 text-sm leading-5 text-gray-900">
                    {patientData.blood_group || "-"}
                  </div>
                </div>
                {patientData.date_of_return && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Date of Return
                    </div>
                    <div className="mt-1 text-sm leading-5 text-gray-900">
                      {moment(patientData.date_of_return).format("LL")}
                    </div>
                  </div>
                )}
                {patientData.is_vaccinated && patientData.number_of_doses && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Number of vaccine doses
                    </div>
                    <div className="mt-1 text-sm leading-5 text-gray-900">
                      {patientData.number_of_doses}
                    </div>
                  </div>
                )}
                {patientData.is_vaccinated && patientData.vaccine_name && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Vaccine name
                    </div>
                    <div className="mt-1 text-sm leading-5 text-gray-900">
                      {patientData.vaccine_name}
                    </div>
                  </div>
                )}
                {patientData.is_vaccinated && patientData.last_vaccinated_date && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Last Vaccinated on
                    </div>
                    <div className="mt-1 text-sm leading-5 text-gray-900">
                      {moment(patientData.last_vaccinated_date).format("LL")}
                    </div>
                  </div>
                )}
                {patientData.countries_travelled &&
                  !!patientData.countries_travelled.length && (
                    <div className="sm:col-span-1">
                      <div className="text-sm leading-5 font-medium text-gray-500">
                        Countries travelled
                      </div>
                      <div className="mt-1 text-sm leading-5 text-gray-900">
                        {Array.isArray(patientData.countries_travelled)
                          ? patientData.countries_travelled.join(", ")
                          : patientData.countries_travelled
                              .split(",")
                              .join(", ")}
                      </div>
                    </div>
                  )}
              </div>
              <div className="flex flex-wrap mt-2 space-x-2">
                {patientData.is_vaccinated ? (
                  <Badge color="blue" icon="syringe" text="Vaccinated" />
                ) : (
                  <Badge
                    color="yellow"
                    icon="exclamation-triangle"
                    text="Not Vaccinated"
                  />
                )}
                {patientData.allow_transfer ? (
                  <Badge color="yellow" icon="unlock" text="Transfer Allowed" />
                ) : (
                  <Badge color="primary" icon="lock" text="Transfer Blocked" />
                )}
                {patientData.gender === 2 &&
                  patientData.is_antenatal &&
                  patientData.is_active && (
                    <Badge color="blue" icon="baby-carriage" text="Antenatal" />
                  )}
                {patientData.contact_with_confirmed_carrier && (
                  <Badge
                    color="red"
                    icon="exclamation-triangle"
                    text="Contact with confirmed carrier"
                  />
                )}
                {patientData.contact_with_suspected_carrier && (
                  <Badge
                    color="yellow"
                    icon="exclamation-triangle"
                    text="Contact with suspected carrier"
                  />
                )}
                {patientData.past_travel && (
                  <Badge
                    color="yellow"
                    icon="exclamation-triangle"
                    text="Travel (within last 28 days)"
                  />
                )}
                {patientData.last_consultation?.is_telemedicine && (
                  <Badge color="purple" icon="phone" text="Telemedicine" />
                )}
              </div>
            </div>
          </div>
          <div className="lg:w-1/3 mx-2 h-full">
            <div
              id="actions"
              className="space-y-2 flex-col justify-between flex h-full"
            >
              <div>
                {patientData.review_time && (
                  <div
                    className={
                      "mb-2 inline-flex items-center px-3 py-1 rounded-lg text-xs leading-4 font-semibold p-1 w-full justify-center " +
                      (moment().isBefore(patientData.review_time)
                        ? " bg-gray-100"
                        : " p-1 bg-red-400 text-white")
                    }
                  >
                    <i className="mr-2 text-md fas fa-clock"></i>
                    {(moment().isBefore(patientData.review_time)
                      ? "Review at: "
                      : "Review Missed: ") +
                      moment(patientData.review_time).format("lll")}
                  </div>
                )}
                <div className="p-2 bg-white rounded-lg shadow text-center">
                  <div className="flex justify-between">
                    <div className="w-1/2 border-r-2 truncate">
                      <div className="text-sm leading-5 font-medium text-gray-500">
                        COVID Status
                      </div>
                      <div className="mt-1 text-xl font-semibold leading-5 text-gray-900">
                        {patientData.disease_status}
                      </div>
                    </div>
                    <div className="w-1/2 truncate">
                      <div className="text-sm leading-5 font-medium text-gray-500">
                        Status
                      </div>
                      <div className="mt-1 text-xl font-semibold leading-5 text-gray-900">
                        {patientData.is_active ? "Live" : "Discharged"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg shadow text-center px-4 mt-2">
                  <div className="w-1/2 border-r-2 truncate">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Created
                    </div>
                    <div className="mt-1 text-sm leading-5 text-gray-900 whitespace-pre">
                      <div className="text-sm">
                        {patientData?.created_by?.first_name}{" "}
                        {patientData?.created_by?.last_name}
                      </div>
                      <div className="text-xs">
                        {patientData.created_date &&
                          moment(patientData.created_date).format("lll")}
                      </div>
                    </div>
                  </div>
                  <div className="w-1/2 truncate">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Last Edited
                    </div>
                    <div className="mt-1 text-sm leading-5 text-gray-900 whitespace-pre">
                      <div className="text-sm">
                        {patientData?.last_edited?.first_name}{" "}
                        {patientData?.last_edited?.last_name}
                      </div>
                      <div className="text-xs">
                        {patientData.modified_date &&
                          moment(patientData.modified_date).format("lll")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 py-2">
                {patientData.disease_status === "EXPIRED" && (
                  <div>
                    <button
                      className="btn btn-primary w-full"
                      name="death_report"
                      onClick={() => navigate(`/death_report/${id}`)}
                    >
                      <i className="fas fa-file-download mr-2" />
                      Death Report
                    </button>
                  </div>
                )}
                <div>
                  <RoleButton
                    className="btn btn-primary w-full"
                    disabled={!patientData.is_active}
                    handleClickCB={() =>
                      navigate(
                        `/facility/${patientData?.facility}/patient/${id}/update`
                      )
                    }
                    disableFor="readOnly"
                    buttonType="html"
                  >
                    <i className="fas fa-pencil-alt mr-2" />
                    Update Details
                  </RoleButton>
                </div>
                <div>
                  <RoleButton
                    className="btn btn-primary w-full"
                    disabled={
                      !consultationListData ||
                      !consultationListData.length ||
                      !patientData.is_active
                    }
                    handleClickCB={() =>
                      handlePatientTransfer(!patientData.allow_transfer)
                    }
                    disableFor="readOnly"
                    buttonType="html"
                  >
                    <i className="fas fa-lock mr-2" />
                    {patientData.allow_transfer
                      ? "Disable Transfer"
                      : "Allow Transfer"}
                  </RoleButton>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className=" bg-white rounded-lg shadow p-4 h-full space-y-2 text-gray-100 mt-4">
          <div
            className="flex justify-between border-b border-dashed text-gray-900 font-semibold text-left text-lg pb-2"
            onClick={() => {
              setShowShifts(!showShifts);
              setIsShiftClicked(true);
            }}
          >
            <div>Shifting</div>
            {showShifts ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </div>
          <div
            className={
              showShifts
                ? activeShiftingData.length
                  ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  : ""
                : "hidden"
            }
          >
            {activeShiftingData.length ? (
              activeShiftingData.map((shift: any) => (
                <div key={`shift_${shift.id}`} className="mx-2 ">
                  <div className="overflow-hidden shadow rounded-lg bg-white h-full">
                    <div
                      className={
                        "p-4 h-full flex flex-col justify-between " +
                        (shift.patient_object.disease_status === "POSITIVE"
                          ? "bg-red-50"
                          : "")
                      }
                    >
                      <div>
                        <div className="flex justify-between mt-1">
                          <div>
                            {shift.emergency && (
                              <span className="flex-shrink-0 inline-block px-2 py-0.5 text-red-800 text-xs leading-4 font-medium bg-red-100 rounded-full">
                                Emergency
                              </span>
                            )}
                          </div>
                        </div>
                        <dl className="grid grid-cols-1 gap-x-1 gap-y-2 sm:grid-cols-1">
                          <div className="sm:col-span-1">
                            <dt
                              title="Shifting status"
                              className="text-sm leading-5 font-medium text-gray-500 flex items-center"
                            >
                              <i className="fas fa-truck mr-2" />
                              <dd className="font-bold text-sm leading-5 text-gray-900">
                                {shift.status}
                              </dd>
                            </dt>
                          </div>
                          <div className="sm:col-span-1">
                            <dt
                              title=" Origin facility"
                              className="text-sm leading-5 font-medium text-gray-500 flex items-center"
                            >
                              <i className="fas fa-plane-departure mr-2"></i>
                              <dd className="font-bold text-sm leading-5 text-gray-900">
                                {(shift.orgin_facility_object || {})?.name}
                              </dd>
                            </dt>
                          </div>
                          <div className="sm:col-span-1">
                            <dt
                              title="Shifting approving facility"
                              className="text-sm leading-5 font-medium text-gray-500 flex items-center"
                            >
                              <i className="fas fa-user-check mr-2"></i>
                              <dd className="font-bold text-sm leading-5 text-gray-900">
                                {
                                  (
                                    shift.shifting_approving_facility_object ||
                                    {}
                                  )?.name
                                }
                              </dd>
                            </dt>
                          </div>
                          <div className="sm:col-span-1">
                            <dt
                              title=" Assigned facility"
                              className="text-sm leading-5 font-medium text-gray-500 flex items-center"
                            >
                              <i className="fas fa-plane-arrival mr-2"></i>

                              <dd className="font-bold text-sm leading-5 text-gray-900">
                                {(shift.assigned_facility_object || {})?.name ||
                                  "Yet to be decided"}
                              </dd>
                            </dt>
                          </div>

                          <div className="sm:col-span-1">
                            <dt
                              title="  Last Modified"
                              className={
                                "text-sm leading-5 font-medium flex items-center " +
                                (moment()
                                  .subtract(2, "hours")
                                  .isBefore(shift.modified_date)
                                  ? "text-gray-900"
                                  : "rounded p-1 bg-red-400 text-white")
                              }
                            >
                              <i className="fas fa-stopwatch mr-2"></i>
                              <dd className="font-bold text-sm leading-5">
                                {moment(shift.modified_date).format("LLL") ||
                                  "--"}
                              </dd>
                            </dt>
                          </div>
                        </dl>
                      </div>
                      <div className="mt-2 flex">
                        <button
                          onClick={() =>
                            navigate(`/shifting/${shift.external_id}`)
                          }
                          className="btn w-full btn-default bg-white mr-2"
                        >
                          <i className="fas fa-eye mr-2" /> All Details
                        </button>
                      </div>
                      {shift.status === "TRANSFER IN PROGRESS" &&
                        shift.assigned_facility && (
                          <div className="mt-2">
                            <Button
                              size="small"
                              variant="outlined"
                              fullWidth
                              onClick={() => setModalFor(shift.external_id)}
                            >
                              TRANSFER TO RECEIVING FACILITY
                            </Button>

                            <Modal
                              open={modalFor === shift.external_id}
                              onClose={() =>
                                setModalFor({
                                  externalId: undefined,
                                  loading: false,
                                })
                              }
                            >
                              <div className="h-screen w-full absolute flex items-center justify-center bg-modal">
                                <div className="bg-white rounded shadow p-8 m-4 max-w-sm max-h-full text-center">
                                  <div className="mb-4">
                                    <h1 className="text-2xl">
                                      Confirm Transfer Complete!
                                    </h1>
                                  </div>
                                  <div className="mb-8">
                                    <p>
                                      Are you sure you want to mark this
                                      transfer as complete? The Origin facility
                                      will no longer have access to this patient
                                    </p>
                                  </div>
                                  <div className="flex gap-2 justify-center">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      fullWidth
                                      onClick={() => {
                                        setModalFor({
                                          externalId: undefined,
                                          loading: false,
                                        });
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      fullWidth
                                      onClick={() =>
                                        handleTransferComplete(shift)
                                      }
                                    >
                                      Confirm
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Modal>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className=" text-center text-gray-500">
                {isShiftDataLoaded ? "No Shifting Records!" : "Loading..."}
              </div>
            )}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 grid-cols-1 mt-4 gap-2">
          <div className="w-full">
            <div className="bg-white rounded-lg shadow p-4 h-full space-y-2">
              <div className="border-b border-dashed text-gray-900 font-semibold text-center text-lg pb-2">
                Location
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Address
                  </div>
                  <div className="my-1 text-sm leading-5 whitespace-normal text-gray-900 break-words">
                    {patientData.address || "-"}
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    District
                  </div>
                  <div className="my-1 text-sm leading-5 whitespace-normal text-gray-900 break-words">
                    {patientData.district_object?.name || "-"}
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Village
                  </div>
                  <div className="my-1 text-sm leading-5 text-gray-900">
                    {patientData.village || "-"}
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Ward
                  </div>
                  <div className="my-1 text-sm leading-5 text-gray-900">
                    {(patientData.ward_object &&
                      patientData.ward_object.number +
                        ", " +
                        patientData.ward_object.name) ||
                      "-"}
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    State, Country - Pincode
                  </div>
                  <div className="my-1 text-sm leading-5 text-gray-900">
                    {patientData?.state_object?.name},{" "}
                    {patientData.nationality || "-"} - {patientData.pincode}
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-sm leading-5 font-medium text-gray-500">
                    Local Body
                  </div>
                  <div className="my-1 text-sm leading-5 text-gray-900">
                    {patientData.local_body_object?.name || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full">
            <div className="bg-white rounded-lg shadow p-4 h-full space-y-2">
              <div className="border-b border-dashed text-gray-900 font-semibold text-center text-lg pb-2">
                Medical
              </div>
              {/* No medical data found */}
              {!patientData.present_health &&
                !patientData.allergies &&
                !patientData.ongoing_medication &&
                patientData.gender === 2 &&
                !patientData.is_antenatal && (
                  <div className="text-gray-500 w-full font-bold flex justify-center items-center text-xl">
                    No Medical History Available
                  </div>
                )}
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:gap-y-8 sm:grid-cols-3 mt-2">
                {patientData.present_health && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Present Health
                    </div>
                    <div className="mt-1 text-sm leading-5 text-gray-900 whitespace-pre-wrap">
                      {patientData.present_health}
                    </div>
                  </div>
                )}
                {patientData.ongoing_medication && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Ongoing Medications
                    </div>
                    <div className="my-1 text-sm leading-5 text-gray-900 whitespace-pre-wrap">
                      {patientData.ongoing_medication}
                    </div>
                  </div>
                )}
                {patientData.allergies && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Allergies
                    </div>
                    <div className="my-1 text-sm leading-5 text-gray-900 whitespace-pre-wrap">
                      {patientData.allergies}
                    </div>
                  </div>
                )}
                {patientData.gender === 2 && patientData.is_antenatal && (
                  <div className="sm:col-span-1">
                    <div className="text-sm leading-5 font-medium text-gray-500">
                      Is pregnant
                    </div>
                    <div className="my-1 text-sm leading-5 text-gray-900">
                      Yes
                    </div>
                  </div>
                )}
                {patientMedHis}
              </div>
            </div>
          </div>
        </section>
        <section className="md:flex mt-4 space-y-2">
          <div className="hidden lg:block">
            <div className="grid 2xl:grid-cols-7 xl:grid-cols-6 lg:grid-cols-5 mt-4 gap-2">
              <div
                className={clsx(
                  "w-full",
                  patientData.is_active &&
                    (!patientData?.last_consultation ||
                      patientData?.last_consultation?.discharge_date)
                    ? "hover:bg-primary-400 cursor-pointer text-primary-700"
                    : "hover:cursor-not-allowed text-gray-700"
                )}
                onClick={() =>
                  patientData.is_active &&
                  (!patientData?.last_consultation ||
                    patientData?.last_consultation?.discharge_date) &&
                  navigate(
                    `/facility/${patientData?.facility}/patient/${id}/consultation`
                  )
                }
              >
                <div className="bg-white rounded-lg shadow p-4 h-full space-y-2">
                  <div className="text-center">
                    <span>
                      <i className="fa-solid fa-comment-medical fa-4x"></i>
                    </span>
                  </div>

                  <div>
                    <p className="text-center">Add Consultation</p>
                  </div>
                </div>
              </div>
              <div
                className="w-full"
                onClick={() => navigate(`/patient/${id}/investigation_reports`)}
              >
                <div className="bg-white rounded-lg shadow p-4 h-full space-y-2 hover:bg-gray-200 hover:cursor-pointer">
                  <div className="text-green-700 text-center">
                    <span>
                      <i className="fa-regular fa-file-lines fa-4x"></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-green-700 text-center">
                      Investigations Summary
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="w-full"
                onClick={() =>
                  navigate(
                    `/facility/${patientData?.facility}/patient/${id}/files/`
                  )
                }
              >
                <div className="bg-white rounded-lg shadow p-4 h-full space-y-2 hover:bg-gray-200 hover:cursor-pointer">
                  <div className="text-green-700 text-center">
                    <span>
                      <i className="fa-solid fa-file-arrow-up fa-4x"></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-green-700 text-center">
                      View/Upload Patient Files
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="w-full"
                onClick={() => {
                  if (
                    !(
                      !patientData.is_active ||
                      !(patientData?.last_consultation?.facility === facilityId)
                    )
                  ) {
                    navigate(`/facility/${facilityId}/patient/${id}/shift/new`);
                  }
                }}
              >
                <div
                  className={`bg-white rounded-lg shadow p-4 h-full space-y-2 ${
                    !patientData.is_active ||
                    !(patientData?.last_consultation?.facility === facilityId)
                      ? " hover:cursor-not-allowed "
                      : " hover:bg-gray-200 hover:cursor-pointer "
                  } `}
                >
                  <div
                    className={`${
                      !patientData.is_active ||
                      !(patientData?.last_consultation?.facility === facilityId)
                        ? "text-gray-700"
                        : "text-green-700"
                    }  text-center `}
                  >
                    <span>
                      <i className="fas fa-ambulance fa-4x"></i>
                    </span>
                  </div>

                  <div>
                    <p
                      className={`${
                        !patientData.is_active ||
                        !(
                          patientData?.last_consultation?.facility ===
                          facilityId
                        )
                          ? "text-gray-700"
                          : "text-green-700"
                      }  text-center `}
                    >
                      SHIFT PATIENT
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="w-full"
                onClick={() => {
                  if (
                    !(
                      !patientData.is_active ||
                      !(patientData?.last_consultation?.facility === facilityId)
                    )
                  ) {
                    navigate(
                      `/facility/${patientData?.facility}/patient/${id}/sample-test`
                    );
                  }
                }}
              >
                <div
                  className={`bg-white rounded-lg shadow p-4 h-full space-y-2 ${
                    !patientData.is_active ||
                    !(patientData?.last_consultation?.facility === facilityId)
                      ? " hover:cursor-not-allowed "
                      : " hover:bg-gray-200 hover:cursor-pointer "
                  } `}
                >
                  <div
                    className={`${
                      !patientData.is_active ||
                      !(patientData?.last_consultation?.facility === facilityId)
                        ? " text-gray-700 "
                        : " text-green-700 "
                    } text-center  `}
                  >
                    <span>
                      <i className="fas fa-medkit fa-4x"></i>
                    </span>
                  </div>
                  <div>
                    <p
                      className={`${
                        !patientData.is_active ||
                        !(
                          patientData?.last_consultation?.facility ===
                          facilityId
                        )
                          ? " text-gray-700 "
                          : " text-green-700 "
                      } text-center  `}
                    >
                      Request Sample Test
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="w-full"
                onClick={() =>
                  navigate(
                    `/facility/${patientData?.facility}/patient/${id}/notes`
                  )
                }
              >
                <div className="bg-white rounded-lg shadow p-4 h-full space-y-2 hover:bg-gray-200 hover:cursor-pointer">
                  <div className="text-green-700 text-center">
                    <span>
                      <i className="fa-solid fa-notes-medical fa-4x"></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-green-700 text-center">
                      View Patient Notes
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="w-full"
                onClick={() => setOpenAssignVolunteerDialog(true)}
              >
                <div className="bg-white rounded-lg shadow p-4 h-full space-y-2 hover:bg-gray-200 hover:cursor-pointer">
                  <div className="text-green-700 text-center">
                    <span>
                      <i className="fa-solid fa-hospital-user fa-4x"></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-green-700 text-center">
                      Assign to a volunteer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full mx-2 lg:hidden">
            <div className="bg-white rounded-lg shadow p-4 h-full space-y-2">
              <div className="border-b border-dashed text-gray-900 font-semibold text-center text-lg space-y-2">
                <div>
                  <button
                    className="btn btn-primary w-full"
                    disabled={
                      !(
                        patientData.is_active &&
                        (!patientData?.last_consultation ||
                          patientData?.last_consultation?.discharge_date)
                      )
                    }
                    onClick={() =>
                      navigate(
                        `/facility/${patientData?.facility}/patient/${id}/consultation`
                      )
                    }
                  >
                    <i className="fa-solid fa-comment-medical mr-2"></i> Add
                    Consultation
                  </button>
                </div>
                <div>
                  <button
                    className="btn btn-primary w-full"
                    onClick={() =>
                      navigate(`/patient/${id}/investigation_reports`)
                    }
                  >
                    <i className="fa-regular fa-file-lines mr-2"></i>{" "}
                    Investigations Summary
                  </button>
                </div>
                <div>
                  <button
                    className="btn btn-primary w-full"
                    onClick={() =>
                      navigate(
                        `/facility/${patientData?.facility}/patient/${id}/files`
                      )
                    }
                  >
                    <i className="fa-solid fa-file-arrow-up mr-2"></i>{" "}
                    View/Upload Patient Files
                  </button>
                </div>
                <div>
                  <RoleButton
                    className="btn btn-primary w-full"
                    disabled={
                      !patientData.is_active ||
                      !(patientData?.last_consultation?.facility == facilityId)
                    }
                    handleClickCB={() =>
                      navigate(
                        `/facility/${facilityId}/patient/${id}/shift/new`
                      )
                    }
                    disableFor="readOnly"
                    buttonType="html"
                  >
                    <i className="fas fa-ambulance mr-2"></i> SHIFT PATIENT
                  </RoleButton>
                </div>
                <div>
                  <RoleButton
                    className="btn btn-primary w-full"
                    disabled={
                      !patientData.is_active ||
                      !(patientData?.last_consultation?.facility == facilityId)
                    }
                    handleClickCB={() =>
                      navigate(
                        `/facility/${patientData?.facility}/patient/${id}/sample-test`
                      )
                    }
                    disableFor="readOnly"
                    buttonType="html"
                  >
                    <i className="fas fa-medkit mr-2"></i> Request Sample Test
                  </RoleButton>
                </div>
                <div>
                  <button
                    className="btn btn-primary w-full"
                    onClick={() =>
                      navigate(
                        `/facility/${patientData?.facility}/patient/${id}/notes`
                      )
                    }
                  >
                    <i className="fa-solid fa-notes-medical mr-2"></i> View
                    Patient Notes
                  </button>
                </div>
                <div>
                  <RoleButton
                    className="btn btn-primary w-full"
                    handleClickCB={() => setOpenAssignVolunteerDialog(true)}
                    disabled={false}
                    disableFor="readOnly"
                    buttonType="html"
                  >
                    <i className="fa-solid fa-hospital-user mr-2"></i> Assign to
                    a volunteer
                  </RoleButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Dialog
        maxWidth={"md"}
        open={openAssignVolunteerDialog}
        onClose={() => setOpenAssignVolunteerDialog(false)}
      >
        <div className="mx-10 my-5">
          <DialogTitle id="form-dialog-title">
            Assign a volunteer to {patientData.name}
          </DialogTitle>

          <div>
            <OnlineUsersSelect
              userId={assignedVolunteerObject?.id || patientData.assigned_to}
              selectedUser={
                assignedVolunteerObject || patientData.assigned_to_object
              }
              onSelect={handleVolunteerSelect}
              user_type={"Volunteer"}
              outline={false}
            />
            <ErrorHelperText error={errors.assignedVolunteer} />
          </div>

          <DialogActions>
            <Button
              onClick={() => {
                handleVolunteerSelect("");
                setOpenAssignVolunteerDialog(false);
              }}
              color="primary"
            >
              Cancel
            </Button>
            <Button onClick={handleAssignedVolunteer} color="primary">
              Submit
            </Button>
          </DialogActions>
        </div>
      </Dialog>

      <div>
        <h2 className="font-semibold text-2xl leading-tight ml-0 my-4">
          Consultation History
        </h2>
        {consultationList}
        {!isConsultationLoading && totalConsultationCount > limit && (
          <div className="mt-4 flex w-full justify-center">
            <Pagination
              cPage={currentConsultationPage}
              defaultPerPage={limit}
              data={{ totalCount: totalConsultationCount }}
              onChange={handleConsultationPagination}
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-2xl leading-tight ml-0 my-4">
          Sample Test History
        </h2>
        {sampleList}
        {!isSampleLoading && totalSampleListCount > limit && (
          <div className="mt-4 flex w-full justify-center">
            <Pagination
              cPage={currentSampleListPage}
              defaultPerPage={limit}
              data={{ totalCount: totalSampleListCount }}
              onChange={handleSampleListPagination}
            />
          </div>
        )}
      </div>
    </div>
  );
};
