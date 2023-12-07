import asyncio
from captain.utils.broadcast import Signaler
from captain.utils.logger import logger
import subprocess

def run_mpr_cmd(port, cmd, manager, jobset_id, signaler=Signaler()):
    """
    This function will run the specified command for the microcontroller.
    Intended to work with mpremote.
    """
    logger.debug(f"running mpr cmd: {cmd}")
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    manager.set_mc(p, port, play=True) # allows to cancel the process
    logger.debug("set the mc_proc")
    ec = p.wait()
    stderr = p.stderr.read().decode() if p.stderr else ""
    stdout = p.stdout.read().decode() if p.stdout else ""
    if p.stderr: p.stderr.close()
    if p.stdout: p.stdout.close()
    if ec != 0:
        logger.error(f"Exit code: {ec}. Got error from MC: {stderr}")
        logger.error(f"stdout: {stdout}")
        asyncio.run(
            signaler.signal_prejob_output(jobset_id, stderr)
        )
        raise Exception("Error: ", stderr, stdout)
    manager.set_mc(None, port, play=False)
    logger.debug("done running mpr cmd")
    return stderr, stdout


