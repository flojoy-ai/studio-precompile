import subprocess
import tempfile
from precompilation.config import COMMAND_TESTS


def test_mc(port, err_type=Exception, tests=COMMAND_TESTS):
    for test, expected_output, err_msg in tests:
        p = run_test(test, port)
        verify_test(p, test, expected_output, err_msg, err_type)


def run_test(test, port):
    cmd = ["mpremote", "connect", port, "run"]
    tmpfile = tempfile.NamedTemporaryFile()
    tmpfilename = tmpfile.name
    f = open(tmpfilename, "w")
    f.write(test)
    f.close()
    p = subprocess.run(
        cmd + [tmpfilename],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
        timeout=5,
    )
    tmpfile.close()
    return p


def verify_test(p, test, expected_output, err_msg, err_type=Exception):
    exitcode = p.returncode
    stdout = p.stdout
    if exitcode != 0 or (expected_output and stdout != expected_output):
        raise err_type(f"{err_msg}. Failing test: {test}. Error:{p.stderr}")
