import ContextMenu from '@app/components/ContextMenu/ContextMenu';
import { CHIPTYPE } from '@app/constants';
import { useModal } from '@app/context/modal-context';
import { ResourceRequestStatus, RowAction, useGetResourceRequestByIdLazyQuery, useGetResourceRequestsQuery, useHandleResourceRequestActionsMutation } from '@app/models';
import objectToListViewer from '@app/utils/objectToListViewer';
import { Button, Link } from '@mui/material';
import Chip from '@mui/material/Chip';
import MUIDataTable from "mui-datatables";
import { useSnackbar } from 'notistack';
import { default as React, useState } from 'react';
import { ApproveModalView } from './ApproveRequest';
import { RejectModalView } from './RejectRequest';

export const ResourceRequestsTable = () => {
    const { setModal, unSetModal } = useModal();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const initRows = [];

    const [rows, setRows] = useState<any>(initRows);

    useGetResourceRequestsQuery({
        fetchPolicy: 'network-only',
        onCompleted: (data) => {
            setRows(data?.sharedResourceRequest?.map((s, index) => {
                return {
                    id: s?.id,
                    project: s?.project,
                    employee: s?.resource?.firstName,
                    manager: s?.requester?.firstName,
                    pillar: s?.pillar,
                    startDate: s?.startDate,
                    endDate: s?.endDate,
                    status: s?.status
                }
            }));
        },
    });

    const [getResourceRequestById] = useGetResourceRequestByIdLazyQuery({
        fetchPolicy: 'network-only',
        onCompleted: (data) => {
            const modalObj = [
                { key: "Project", value: data.sharedResourceRequestById?.project },
                { key: "Manager", value: data.sharedResourceRequestById?.requester?.firstName, render: () => <Link component="button" variant="body2">{data.sharedResourceRequestById?.requester?.firstName}</Link> },
                { key: "Pillar", value: data.sharedResourceRequestById?.pillar },
                { key: "Project Start Date", value: data.sharedResourceRequestById?.startDate },
                { key: "Project End Date", value: data.sharedResourceRequestById?.endDate },
                { key: "Status", value: data.sharedResourceRequestById?.status, }
            ];
            setModal({ title: "Resource Request", modalBody: objectToListViewer(modalObj, ["id"]), modalFooter: <><Button autoFocus onClick={unSetModal}>Close</Button></> });
        }
    });

    const [submitRequestAction] = useHandleResourceRequestActionsMutation({
        onCompleted: (data) => {
            if (data.handleResourceRequestActions) {
                enqueueSnackbar('The request has been ' + data.handleResourceRequestActions.status, {
                    variant: CHIPTYPE.SUCCESS
                });
                const index = rows.findIndex((row) => row.id == data.handleResourceRequestActions?.id);
                if (index != -1) {
                    rows[index].status = data.handleResourceRequestActions.status;
                }
                unSetModal();
            }
        },
        onError: (data) => {
            enqueueSnackbar('Error while performing action!', {
                variant: CHIPTYPE.ERROR
            });
        }

    });

    const tableOptions = { selectableRows: "none", };
    const columns = [{
        name: "id",
        options: {
            display: "excluded",
            filter: false,
            sort: false,
        }
    }, {
        label: "Project", name: "project",
        options: {
            filter: true,
            sort: true
        }
    }, {
        label: "Employee", name: "employee",
        options: {
            filter: true,
            sort: false,
            customBodyRender: (value) => {
                return (
                    (value ? <Link component="button" variant="body2">{value}</Link> : "UNASSIGNED")
                );
            }
        }
    },
    {
        label: "Manager", name: "manager",
        options: {
            filter: true,
            sort: true
        }
    },
    {
        label: "Pillar", name: "pillar",
        options: {
            filter: true,
            sort: true
        }
    },
    {
        label: "Start Date", name: "startDate",
        options: {
            filter: true,
            sort: true
        }
    },
    {
        label: "End Date", name: "endDate",
        options: {
            filter: true,
            sort: true
        }
    },
    {
        label: "Status", name: "status",
        options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => {
                return (
                    <Chip label={value} color={(value == ResourceRequestStatus.Completed ? CHIPTYPE.SUCCESS : CHIPTYPE.WARNING)} />
                );
            }
        }
    },
    {
        name: "Actions",
        options: {
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
                const actions = [
                    {
                        name: "View",
                        onClick: () => {
                            getResourceRequestById({ variables: { id: tableMeta.rowData[0] } })
                        }
                    },
                    {
                        name: "Approve",
                        onClick: () => {
                            setModal({
                                composite: false,
                                title: "Request Approval",
                                modalBody: <ApproveModalView
                                    resourceRequestId={tableMeta.rowData[0]}
                                    onApprove={(requestId, selectedresourceId) => {
                                        submitRequestAction({
                                            variables: {
                                                action: RowAction.Approve,
                                                resourceRequest: {
                                                    resource: {
                                                        id: selectedresourceId
                                                    },
                                                    id: requestId
                                                }
                                            }
                                        })
                                    }} />
                            });
                        }
                    },
                    {
                        name: "Reject",
                        onClick: () => {
                            setModal({
                                composite: false,
                                title: "Request Rejection",
                                modalBody: <RejectModalView
                                    resourceRequestId={tableMeta.rowData[0]}
                                    onReject={(requestId, reason) => {
                                        submitRequestAction({
                                            variables: {
                                                action: RowAction.Reject,
                                                resourceRequest: {
                                                    id: requestId
                                                }
                                            }
                                        })
                                    }} />
                            });
                        }
                    },
                ];
                return (
                    <ContextMenu actions={actions} />
                );
            }
        }
    }];
    return (
        <>
            <MUIDataTable data={rows} columns={columns} options={tableOptions} />
        </>
    )
}



