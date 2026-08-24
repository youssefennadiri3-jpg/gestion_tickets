import django.db.backends.base.base
import django.db.backends.mysql.features

# Bypass version check
django.db.backends.base.base.BaseDatabaseWrapper.check_database_version_supported = lambda self: None

# Disable RETURNING clause for older MariaDB/MySQL versions
django.db.backends.mysql.features.DatabaseFeatures.can_return_columns_from_insert = False