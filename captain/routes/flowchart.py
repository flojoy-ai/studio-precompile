import asyncio, os, sys, json, time

sys.path.append(os.path.abspath(os.getcwd()))
from fastapi import APIRouter, Request, Response
from captain.types.flowchart import (
    PostCancelFC,
    PostWFC,
)
from captain.utils.broadcast import broadcast_worker_response, signal_prejob_op, signal_standby
from captain.utils.flowchart_utils import (
    create_topology,
    prepare_for_next_run,
    spawn_workers,
)
from captain.utils.config import manager
from captain.utils.status_codes import STATUS_CODES
from captain.utils.logger import logger

router = APIRouter(tags=["flowchart"])


"""
FRONT-END CLIENT ACCESSED END-POINTS
______________________________________

These end-points are accessed by the front-end client. They are used to
initiate processes on the back-end.
"""

# TODO do we want to convert field names from camelCase to snake_case?


@router.post("/cancel_fc", summary="cancel flowchart")
async def cancel_fc(req: PostCancelFC):
    logger.info("Cancelling flowchart...")
    if manager.running_topology is not None:
        manager.running_topology.cancel()
    if req.jobsetId is None: 
        logger.debug("No jobsetId provided, skipping signal_standby")
        return
    asyncio.create_task(signal_standby(manager, req.jobsetId))


@router.post("/wfc", summary="write and run flowchart")
async def write_and_run_flowchart(request: PostWFC):

    # create message for front-end to indicate we are running pre-job operations
    if request.jobsetId is None:
        logger.debug("No jobsetId provided, skipping signal_prejob_op")
        return
    asyncio.create_task(signal_prejob_op(manager, request.jobsetId))

    # prepare for next topology run, clear memory 
    prepare_for_next_run()

    # create the topology
    manager.running_topology = create_topology(
        request, manager.worker_processes
    )

    # get the amount of workers needed
    spawn_workers(manager)
    time.sleep(
        1
    )  # OPTIONAL. Give workers time to start. Not really needed, only because job is queued before the worker actually starts. Prevents slow start.

    # run the flowchart
    asyncio.create_task(manager.running_topology.run())


"""
BACK-END CLIENT ACCESSED END-POINTS
_____________________________________

These end-points are accessed by the back-end client. They are used to implement
the event driven paradigm of the back-end. Workers that run jobs will poll these to 
signal a job has been finished.
"""


@router.post("/worker_response", summary="worker response")
async def worker_response(
    request: Request,
):  # TODO figure out way to use Pydantic model, for now use type Request otherwise does not work????
    if manager.running_topology is not None and manager.running_topology.is_cancelled():
        logger.debug("Flowchart is cancelled, ignoring worker response")
        return Response(status_code=200)

    logger.debug("Received a response from a worker")

    request_json = await request.json()
    request_dict = json.loads(request_json)

    # broadcast worker response to frontend
    asyncio.create_task(broadcast_worker_response(manager, request_dict))

    if "NODE_RESULTS" in request_dict:
        job_id: str = request_dict.get("NODE_RESULTS", {}).get("id", None)
        logger.debug(f"{job_id} finished at {time.time()}")
        asyncio.create_task(manager.running_topology.handle_finished_job(request_dict))  # type: ignore
