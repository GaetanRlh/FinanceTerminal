from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("market", "0011_alter_watchlistitem_unique_together_and_more"),
    ]

    operations = [
        migrations.DeleteModel(name="TradeReview"),
        migrations.DeleteModel(name="ScreenerPreset"),
    ]
