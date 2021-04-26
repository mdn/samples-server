samples-server
==============

### Notice
The MDN samples-server service at https://mdn-samples.mozilla.org/ (https://github.com/mdn/samples-server) has been shut down for security reasons. The existing examples will of course stop working until they can be replaced with something better, and although we're sorry for the inconvenience, we felt the inconvenience was outweighed by the security vulnerability.

### See also
- https://github.com/mdn/content/issues/4116
- https://github.com/mdn/content/issues/4263

### Original README
This is a live sample server for MDN, which I hope we will be able to use to host content that only works when on a less restrictive environment than running in an iframe on Kuma.

The ''s'' directory contains a folder for each project that needs to be available. Each one has a manifest and whatever files that service requires.

The ''v'' directory is a place we can keep miscellaneous assets which may be needed by MDN content, can't be attached to MDN pages, and have no other home.
