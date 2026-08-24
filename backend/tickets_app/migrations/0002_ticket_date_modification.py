import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets_app', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='date_modification',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
